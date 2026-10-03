import { Inject, Injectable } from "@nestjs/common";
import { Database } from "../db";
import { fail } from "../common/errors";
import { Session } from "../common/models";
import {
  hashPassword,
  hashToken,
  newSessionToken,
  verifyPassword,
} from "../security";
import { UserRow, publicUser } from "../users/user.entity";
import { UsersRepository } from "../users/users.repository";
import { ProjectsService } from "../projects/projects.service";
import { SessionsRepository } from "./sessions.repository";
import { LoginThrottle } from "./login-throttle";
import { LoginDto, ChangePasswordDto } from "./auth.dto";
@Injectable()
export class AuthService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(UsersRepository) private readonly users: UsersRepository,
    @Inject(SessionsRepository) private readonly sessions: SessionsRepository,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(LoginThrottle) private readonly throttle: LoginThrottle,
  ) {}
  async current(
    token: string | undefined,
    allowPasswordGate = false,
  ): Promise<UserRow> {
    if (!token || token.length > 200) fail(401, "Unauthorized");
    const user = await this.sessions.current(hashToken(token));
    if (!user?.active) fail(401, "Unauthorized");
    if (user.must_change_password && !allowPasswordGate)
      fail(403, "Password change required");
    return user;
  }
  async session(user: UserRow): Promise<Session> {
    return {
      user: publicUser(user),
      projects: await this.projects.accessible(user),
    };
  }
  async login(
    input: LoginDto,
    ip: string | undefined,
  ): Promise<{ token: string; user: UserRow }> {
    const key = `${ip}:${input.username}`;
    // Reserve before the first await, so concurrent attempts share the same limit.
    this.throttle.reserve(key);
    const user = await this.users.findByUsername(input.username);
    if (
      !user?.active ||
      input.password === undefined ||
      !(await verifyPassword(input.password, user.password_hash))
    )
      fail(401, "Invalid username or password");
    const token = newSessionToken();
    await this.db.transaction(async (client) => {
      const current = await this.users.lock(user.id, client);
      if (!current?.active || current.password_hash !== user.password_hash)
        fail(401, "Invalid username or password");
      await this.sessions.issue(token.hash, user.id, client);
    });
    this.throttle.clear(key);
    return { token: token.token, user };
  }
  async logout(token: string | undefined): Promise<{ ok: true }> {
    if (token && token.length <= 200)
      await this.sessions.revoke(hashToken(token));
    return { ok: true };
  }
  async changePassword(
    sessionToken: string,
    input: ChangePasswordDto,
  ): Promise<{ token: string; user: UserRow }> {
    const newHash = await hashPassword(input.newPassword);
    const token = newSessionToken();
    const user = await this.db.transaction(async (client) => {
      const current = await this.sessions.lockCurrent(
        hashToken(sessionToken),
        client,
      );
      if (!current?.active) fail(401, "Unauthorized");
      if (!(await verifyPassword(input.currentPassword, current.password_hash)))
        fail(400, "Current password is incorrect");
      await this.users.setPassword(current.id, newHash, false, client);
      await this.sessions.revokeUser(current.id, client);
      await this.sessions.issue(token.hash, current.id, client);
      return {
        ...current,
        password_hash: newHash,
        must_change_password: false,
      };
    });
    return { token: token.token, user };
  }
}
