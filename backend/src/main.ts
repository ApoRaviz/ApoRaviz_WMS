import "reflect-metadata";
import {
  Body,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { Database } from "./db";
import { AdminController } from "./admin/admin.controller";
import { AuthController } from "./auth/auth.controller";
import { ProjectsController } from "./projects/projects.controller";
import {
  hashPassword,
  hashToken,
  newSessionToken,
  verifyPassword,
} from "./security";

type RoleId = "manager" | "supervisor" | "operator" | "customer";
type Membership = { projectId: string; roleId: RoleId };
type UserRow = {
  id: string;
  username: string;
  name: string;
  password_hash: string;
  is_admin: boolean;
  active: boolean;
  must_change_password: boolean;
};
const roles = new Set<RoleId>([
  "manager",
  "supervisor",
  "operator",
  "customer",
]);
const cookieName = "wms_session";
const attempts = new Map<string, { count: number; reset: number }>();

function fail(status: number, message: string | string[]): never {
  throw new HttpException(message, status);
}
function parseCookie(req: Request): string | undefined {
  for (const part of (req.headers.cookie || "").split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === cookieName) {
      try {
        return decodeURIComponent(value.join("="));
      } catch {
        return undefined;
      }
    }
  }
}
function publicUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    isAdmin: row.is_admin,
    active: row.active,
    mustChangePassword: row.must_change_password,
  };
}
function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}
function validatedMemberships(value: unknown): Membership[] {
  if (!Array.isArray(value)) fail(400, "memberships must be an array");
  const seen = new Set<string>();
  return value.map((item: any) => {
    if (!item || typeof item.projectId !== "string" || !roles.has(item.roleId))
      fail(400, "Invalid membership");
    if (seen.has(item.projectId)) fail(400, "Duplicate project membership");
    seen.add(item.projectId);
    return { projectId: item.projectId, roleId: item.roleId };
  });
}

@Injectable()
export class AccessService {
  constructor(@Inject(Database) private readonly db: Database) {}

  private async current(
    req: Request,
    allowPasswordGate = false,
  ): Promise<UserRow> {
    const token = parseCookie(req);
    if (!token || token.length > 200) fail(401, "Unauthorized");
    const result = await this.db.query<UserRow>(
      `SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,
      [hashToken(token)],
    );
    const user = result.rows[0];
    if (!user || !user.active) fail(401, "Unauthorized");
    if (user.must_change_password && !allowPasswordGate)
      fail(403, "Password change required");
    return user;
  }
  private async session(user: UserRow) {
    if (user.is_admin) {
      const all = await this.db.query(
        "SELECT id,code,name,client,description,accent FROM projects ORDER BY name",
      );
      return {
        user: publicUser(user),
        projects: all.rows.map((project: any) => ({
          ...project,
          roleId: "administrator",
          roleName: "Administrator",
          permissions: ["workspace.view"],
        })),
      };
    }
    const projects = await this.db.query(
      `SELECT p.id,p.code,p.name,p.client,p.description,p.accent,m.role_id,"r".name role_name,coalesce(array_agg(rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL),'{}') permissions FROM projects p JOIN memberships m ON m.project_id=p.id JOIN roles "r" ON "r".id=m.role_id LEFT JOIN role_permissions rp ON rp.role_id=m.role_id WHERE m.user_id=$1 GROUP BY p.id,m.role_id,"r".name ORDER BY p.name`,
      [user.id],
    );
    return {
      user: publicUser(user),
      projects: projects.rows.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        client: p.client,
        description: p.description,
        accent: p.accent,
        roleId: p.role_id,
        roleName: p.role_name,
        permissions: p.permissions,
      })),
    };
  }
  private setCookie(res: Response, token: string) {
    res.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/",
    });
  }
  private async issue(userId: string) {
    const value = newSessionToken();
    await this.db.query(
      `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '8 hours')`,
      [value.hash, userId],
    );
    return value.token;
  }
  private async admin(req: Request) {
    const user = await this.current(req);
    if (!user.is_admin) fail(403, "Administrator access required");
    return user;
  }
  private async managed(id: string) {
    const found = await this.db.query<UserRow>(
      "SELECT * FROM users WHERE id=$1",
      [id],
    );
    if (!found.rows[0]) fail(404, "User not found");
    const memberships = await this.db.query(
      'SELECT project_id "projectId",role_id "roleId" FROM memberships WHERE user_id=$1 ORDER BY project_id',
      [id],
    );
    return { ...publicUser(found.rows[0]), memberships: memberships.rows };
  }

  @Get("health") async health() {
    await this.db.query("SELECT 1");
    return { status: "ok" };
  }
  @Post("auth/login") async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: any,
  ) {
    const username =
      typeof body?.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    const key = `${req.ip}:${username}`;
    const now = Date.now();
    if (attempts.size > 10_000) {
      for (const [candidate, value] of attempts) {
        if (value.reset <= now || attempts.size > 10_000)
          attempts.delete(candidate);
      }
    }
    const previous = attempts.get(key);
    const count = previous && previous.reset > now ? previous.count : 0;
    if (count >= 5) fail(429, "Too many login attempts");
    attempts.set(key, { count: count + 1, reset: now + 15 * 60_000 });
    const found = await this.db.query<UserRow>(
      "SELECT * FROM users WHERE lower(username)=lower($1)",
      [username],
    );
    const user = found.rows[0];
    if (
      !user ||
      !user.active ||
      typeof body.password !== "string" ||
      !(await verifyPassword(body.password, user.password_hash))
    ) {
      fail(401, "Invalid username or password");
    }
    const token = newSessionToken();
    await this.db.transaction(async (client) => {
      const current = await client.query<UserRow>(
        "SELECT * FROM users WHERE id=$1 FOR UPDATE",
        [user.id],
      );
      if (
        !current.rows[0]?.active ||
        current.rows[0].password_hash !== user.password_hash
      )
        fail(401, "Invalid username or password");
      await client.query(
        `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '8 hours')`,
        [token.hash, user.id],
      );
    });
    attempts.delete(key);
    this.setCookie(res, token.token);
    return this.session(user);
  }
  @Get("auth/me") async me(@Req() req: Request) {
    return this.session(await this.current(req, true));
  }
  @Post("auth/logout") async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = parseCookie(req);
    if (token && token.length <= 200)
      await this.db.query("DELETE FROM sessions WHERE token_hash=$1", [
        hashToken(token),
      ]);
    res.clearCookie(cookieName, { path: "/" });
    return { ok: true };
  }
  @Post("auth/password") async password(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: any,
  ) {
    const user = await this.current(req, true);
    if (!validPassword(body?.newPassword))
      fail(400, "New password must be 12 to 128 characters");
    if (typeof body.currentPassword !== "string")
      fail(400, "Current password is incorrect");
    if (body.currentPassword === body.newPassword)
      fail(400, "New password must be different");
    const newHash = await hashPassword(body.newPassword);
    const token = newSessionToken();
    await this.db.transaction(async (c) => {
      const sessionToken = parseCookie(req);
      const locked = await c.query<UserRow>(
        `SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() FOR UPDATE OF u,s`,
        [hashToken(sessionToken!)],
      );
      const current = locked.rows[0];
      if (!current?.active) fail(401, "Unauthorized");
      if (!(await verifyPassword(body.currentPassword, current.password_hash)))
        fail(400, "Current password is incorrect");
      await c.query(
        "UPDATE users SET password_hash=$1,must_change_password=false WHERE id=$2",
        [newHash, current.id],
      );
      await c.query("DELETE FROM sessions WHERE user_id=$1", [current.id]);
      await c.query(
        `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '8 hours')`,
        [token.hash, current.id],
      );
      Object.assign(user, current, {
        password_hash: newHash,
        must_change_password: false,
      });
    });
    this.setCookie(res, token.token);
    return this.session(user);
  }
  @Get("projects/:id/workspace") async workspace(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const user = await this.current(req);
    const result = await this.session(user);
    const project = user.is_admin
      ? await this.adminProject(id)
      : result.projects.find(
          (p: any) => p.id === id && p.permissions.includes("workspace.view"),
        );
    if (!project) fail(403, "Project access denied");
    return { project };
  }
  private async adminProject(id: string) {
    const p = await this.db.query("SELECT * FROM projects WHERE id=$1", [id]);
    if (!p.rows[0]) fail(403, "Project access denied");
    return {
      ...p.rows[0],
      roleId: "administrator",
      roleName: "Administrator",
      permissions: ["workspace.view"],
    };
  }
  @Get("admin/users") async users(@Req() req: Request) {
    await this.admin(req);
    const result = await this.db.query<{ id: string }>(
      "SELECT id FROM users ORDER BY username",
    );
    return Promise.all(result.rows.map((r) => this.managed(r.id)));
  }
  @Post("admin/users") async createUser(
    @Req() req: Request,
    @Body() body: any,
  ) {
    await this.admin(req);
    const username =
      typeof body?.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!/^[a-z0-9._-]{3,50}$/.test(username)) fail(400, "Invalid username");
    if (!name || name.length > 100) fail(400, "Invalid name");
    if (!validPassword(body.password))
      fail(400, "Password must be 12 to 128 characters");
    const memberships = validatedMemberships(body.memberships);
    const id = randomUUID();
    try {
      await this.db.transaction(async (c) => {
        await c.query(
          "INSERT INTO users(id,username,name,password_hash,is_admin) VALUES ($1,$2,$3,$4,$5)",
          [
            id,
            username,
            name,
            await hashPassword(body.password),
            body.isAdmin === true,
          ],
        );
        for (const m of memberships)
          await c.query(
            "INSERT INTO memberships(user_id,project_id,role_id) VALUES ($1,$2,$3)",
            [id, m.projectId, m.roleId],
          );
      });
    } catch (e: any) {
      if (e.code === "23505") fail(409, "Username already exists");
      if (e.code === "23503") fail(400, "Invalid membership");
      throw e;
    }
    return this.managed(id);
  }
  @Patch("admin/users/:id") async patchUser(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const actor = await this.admin(req);
    await this.managed(id);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (
      !name ||
      name.length > 100 ||
      typeof body.active !== "boolean" ||
      typeof body.isAdmin !== "boolean"
    )
      fail(400, "Invalid user");
    const memberships = validatedMemberships(body.memberships);
    if (actor.id === id && (!body.active || !body.isAdmin))
      fail(400, "You cannot disable or demote yourself");
    try {
      await this.db.transaction(async (c) => {
        await c.query("SELECT pg_advisory_xact_lock(8675309)");
        const lockedActor = await c.query<UserRow>(
          "SELECT * FROM users WHERE id=$1 FOR UPDATE",
          [actor.id],
        );
        if (!lockedActor.rows[0]?.active || !lockedActor.rows[0].is_admin)
          fail(403, "Administrator access required");
        const target = await c.query<UserRow>(
          "SELECT * FROM users WHERE id=$1 FOR UPDATE",
          [id],
        );
        if (!target.rows[0]) fail(404, "User not found");
        if (
          target.rows[0].is_admin &&
          target.rows[0].active &&
          (!body.isAdmin || !body.active)
        ) {
          const activeAdmins = await c.query(
            "SELECT id FROM users WHERE is_admin AND active FOR UPDATE",
          );
          if ((activeAdmins.rowCount ?? 0) <= 1)
            fail(400, "At least one active administrator is required");
        }
        await c.query(
          "UPDATE users SET name=$1,active=$2,is_admin=$3 WHERE id=$4",
          [name, body.active, body.isAdmin, id],
        );
        await c.query("DELETE FROM memberships WHERE user_id=$1", [id]);
        for (const m of memberships)
          await c.query(
            "INSERT INTO memberships(user_id,project_id,role_id) VALUES ($1,$2,$3)",
            [id, m.projectId, m.roleId],
          );
        await c.query("DELETE FROM sessions WHERE user_id=$1", [id]);
      });
    } catch (e: any) {
      if (e.code === "23503") fail(400, "Invalid membership");
      throw e;
    }
    return this.managed(id);
  }
  @Post("admin/users/:id/reset-password") async reset(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const actor = await this.admin(req);
    if (actor.id === id) fail(400, "Use your own password page");
    if (!validPassword(body?.password))
      fail(400, "Password must be 12 to 128 characters");
    await this.db.transaction(async (client) => {
      const target = await client.query<UserRow>(
        "SELECT * FROM users WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!target.rows[0]) fail(404, "User not found");
      const passwordHash = await hashPassword(body.password);
      await client.query(
        "UPDATE users SET password_hash=$1,must_change_password=true WHERE id=$2",
        [passwordHash, id],
      );
      await client.query("DELETE FROM sessions WHERE user_id=$1", [id]);
    });
    return { ok: true };
  }
  @Get("admin/projects") async adminProjects(@Req() req: Request) {
    await this.admin(req);
    return (
      await this.db.query(
        "SELECT id,code,name,client,description,accent FROM projects ORDER BY name",
      )
    ).rows;
  }
  @Get("admin/roles") async adminRoles(@Req() req: Request) {
    await this.admin(req);
    const rs = await this.db.query(
      `SELECT r.id,r.name,coalesce(array_agg(rp.permission_id) FILTER(WHERE rp.permission_id IS NOT NULL),'{}') permissions FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id GROUP BY r.id ORDER BY r.name`,
    );
    const permissions = (
      await this.db.query("SELECT id,name FROM permissions ORDER BY id")
    ).rows;
    return { roles: rs.rows, permissions };
  }
  @Put("admin/roles/:id") async role(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    await this.admin(req);
    if (!roles.has(id as RoleId)) fail(400, "Unknown role");
    if (
      !Array.isArray(body?.permissions) ||
      body.permissions.some((p: any) => p !== "workspace.view") ||
      new Set(body.permissions).size !== body.permissions.length
    )
      fail(400, "Unknown permission");
    await this.db.transaction(async (c) => {
      await c.query("DELETE FROM role_permissions WHERE role_id=$1", [id]);
      for (const permission of body.permissions)
        await c.query(
          "INSERT INTO role_permissions(role_id,permission_id) VALUES ($1,$2)",
          [id, permission],
        );
    });
    return {
      id,
      name: (
        await this.db.query<{ name: string }>(
          "SELECT name FROM roles WHERE id=$1",
          [id],
        )
      ).rows[0].name,
      permissions: body.permissions,
    };
  }
}

export async function createApp(options: { testing?: boolean } = {}) {
  const database = new Database(options);
  await database.initialize();
  @Module({
    controllers: [AuthController, AdminController, ProjectsController],
    providers: [
      { provide: Database, useValue: database },
      { provide: "ACCESS_SERVICE", useClass: AccessService },
    ],
  })
  class AppModule {}
  const app = await NestFactory.create(AppModule, { logger: ["error"] });
  app.setGlobalPrefix("api");
  app.use((req: Request, _res: Response, next: (error?: unknown) => void) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("X-WMS-Request") !== "1")
        return next(
          new HttpException(
            "X-WMS-Request header required",
            HttpStatus.FORBIDDEN,
          ),
        );
      const origin = req.get("Origin");
      if (origin && origin !== process.env.APP_ORIGIN)
        return next(
          new HttpException("Origin not allowed", HttpStatus.FORBIDDEN),
        );
    }
    next();
  });
  const originalClose = app.close.bind(app);
  app.close = async () => {
    await originalClose();
    await database.close();
  };
  await app.init();
  return app;
}

if (require.main === module) {
  void createApp().then((app) =>
    app.listen(Number(process.env.PORT || 3000), "127.0.0.1"),
  );
}
