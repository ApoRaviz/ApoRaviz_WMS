import request from "supertest";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { createApp } from "../src/main";
import { Database } from "../src/db";

describe("Module 1 access API", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  const changedAdminPassword = "Changed-password-123!";

  async function adminCookie() {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({
        username: process.env.ADMIN_USERNAME,
        password: changedAdminPassword,
      })
      .expect(201);
    return response.headers["set-cookie"][0].split(";")[0];
  }

  beforeAll(async () => {
    app = await createApp({ testing: true });
  });

  afterAll(async () => {
    await app.close();
  });

  test("reports health only when the database is ready", async () => {
    await request(app.getHttpServer())
      .get("/api/health")
      .expect(200, { status: "ok" });
  });

  test("logs in generically, gates temporary passwords, rotates password, and logs out", async () => {
    const bad = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({ username: "admin", password: "wrong-password" });
    expect(bad.status).toBe(401);
    expect(bad.body.message).toBe("Invalid username or password");

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      });
    expect(login.status).toBe(201);
    expect(login.body.user.mustChangePassword).toBe(true);
    const cookie = login.headers["set-cookie"][0].split(";")[0];
    await request(app.getHttpServer())
      .get("/api/admin/users")
      .set("Cookie", cookie)
      .expect(403);

    const changed = await request(app.getHttpServer())
      .post("/api/auth/password")
      .set("Cookie", cookie)
      .set("X-WMS-Request", "1")
      .send({
        currentPassword: process.env.ADMIN_PASSWORD,
        newPassword: changedAdminPassword,
      })
      .expect(201);
    expect(changed.body.user.mustChangePassword).toBe(false);
    const rotatedCookie = changed.headers["set-cookie"][0].split(";")[0];
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", cookie)
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/auth/logout")
      .set("Cookie", rotatedCookie)
      .set("X-WMS-Request", "1")
      .send({})
      .expect(201, { ok: true });
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", rotatedCookie)
      .expect(401);
  });

  test("company administrator sees every project as administrator", async () => {
    const cookie = await adminCookie();
    const me = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", cookie)
      .expect(200);
    expect(
      me.body.projects.map((project: any) => [project.id, project.roleId]),
    ).toEqual([
      ["apo", "administrator"],
      ["mdr", "administrator"],
      ["squ", "administrator"],
    ]);
  });

  test("enforces memberships, editable role permissions, and non-admin denial", async () => {
    const admin = await adminCookie();
    const created = await request(app.getHttpServer())
      .post("/api/admin/users")
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({
        username: "worker.one",
        name: "Worker One",
        password: "Temporary-123!",
        isAdmin: false,
        memberships: [
          { projectId: "apo", roleId: "manager" },
          { projectId: "squ", roleId: "operator" },
        ],
      })
      .expect(201);
    expect(created.body.memberships).toEqual([
      { projectId: "apo", roleId: "manager" },
      { projectId: "squ", roleId: "operator" },
    ]);

    await request(app.getHttpServer())
      .post("/api/admin/users")
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({
        username: "WORKER.ONE",
        name: "Duplicate",
        password: "Temporary-123!",
        isAdmin: false,
        memberships: [],
      })
      .expect(409);
    await request(app.getHttpServer())
      .post("/api/admin/users")
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({
        username: "worker.two",
        name: "Worker Two",
        password: "Temporary-123!",
        isAdmin: false,
        memberships: [
          { projectId: "apo", roleId: "manager" },
          { projectId: "apo", roleId: "operator" },
        ],
      })
      .expect(400);

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({ username: "worker.one", password: "Temporary-123!" })
      .expect(201);
    const firstCookie = login.headers["set-cookie"][0].split(";")[0];
    const changed = await request(app.getHttpServer())
      .post("/api/auth/password")
      .set("Cookie", firstCookie)
      .set("X-WMS-Request", "1")
      .send({
        currentPassword: "Temporary-123!",
        newPassword: "Worker-password-123!",
      })
      .expect(201);
    const worker = changed.headers["set-cookie"][0].split(";")[0];
    await request(app.getHttpServer())
      .get("/api/projects/apo/workspace")
      .set("Cookie", worker)
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/projects/mdr/workspace")
      .set("Cookie", worker)
      .expect(403);
    await request(app.getHttpServer())
      .get("/api/admin/users")
      .set("Cookie", worker)
      .expect(403);

    await request(app.getHttpServer())
      .put("/api/admin/roles/manager")
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({ permissions: [] })
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/projects/apo/workspace")
      .set("Cookie", worker)
      .expect(403);
    await request(app.getHttpServer())
      .put("/api/admin/roles/manager")
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({ permissions: ["workspace.view"] })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/admin/users/${created.body.id}/reset-password`)
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({ password: "Reset-password-123!" })
      .expect(201, { ok: true });
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", worker)
      .expect(401);
    const resetLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({ username: "worker.one", password: "Reset-password-123!" })
      .expect(201);
    const resetCookie = resetLogin.headers["set-cookie"][0].split(";")[0];
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${created.body.id}`)
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({
        name: "Worker One",
        active: false,
        isAdmin: false,
        memberships: created.body.memberships,
      })
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", resetCookie)
      .expect(401);
  });

  test("protects the current and last active administrator", async () => {
    const admin = await adminCookie();
    const me = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", admin)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${me.body.user.id}`)
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({
        name: me.body.user.name,
        active: true,
        isAdmin: false,
        memberships: [],
      })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${me.body.user.id}`)
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({
        name: me.body.user.name,
        active: false,
        isAdmin: true,
        memberships: [],
      })
      .expect(400);
  });

  test("concurrent login failures consume throttle reservations", async () => {
    const admin = await adminCookie();
    await request(app.getHttpServer())
      .post("/api/admin/users")
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({
        username: "throttle.user",
        name: "Throttle User",
        password: "Throttle-password-123!",
        isAdmin: false,
        memberships: [],
      })
      .expect(201);
    await Promise.all(
      Array.from({ length: 6 }, () =>
        request(app.getHttpServer())
          .post("/api/auth/login")
          .set("X-WMS-Request", "1")
          .send({ username: "throttle.user", password: "Wrong-password-123!" }),
      ),
    );
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({ username: "throttle.user", password: "Throttle-password-123!" })
      .expect(429);
  });

  test("concurrent administrators cannot disable each other and leave no active admin", async () => {
    const firstCookie = await adminCookie();
    const firstMe = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", firstCookie)
      .expect(200);
    const second = await request(app.getHttpServer())
      .post("/api/admin/users")
      .set("Cookie", firstCookie)
      .set("X-WMS-Request", "1")
      .send({
        username: "concurrent.admin",
        name: "Concurrent Admin",
        password: "Concurrent-temp-123!",
        isAdmin: true,
        memberships: [],
      })
      .expect(201);
    const secondLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({ username: "concurrent.admin", password: "Concurrent-temp-123!" })
      .expect(201);
    const temporary = secondLogin.headers["set-cookie"][0].split(";")[0];
    const secondChange = await request(app.getHttpServer())
      .post("/api/auth/password")
      .set("Cookie", temporary)
      .set("X-WMS-Request", "1")
      .send({
        currentPassword: "Concurrent-temp-123!",
        newPassword: "Concurrent-admin-123!",
      })
      .expect(201);
    const secondCookie = secondChange.headers["set-cookie"][0].split(";")[0];

    const results = await Promise.all([
      request(app.getHttpServer())
        .patch(`/api/admin/users/${second.body.id}`)
        .set("Cookie", firstCookie)
        .set("X-WMS-Request", "1")
        .send({
          name: second.body.name,
          active: false,
          isAdmin: true,
          memberships: [],
        }),
      request(app.getHttpServer())
        .patch(`/api/admin/users/${firstMe.body.user.id}`)
        .set("Cookie", secondCookie)
        .set("X-WMS-Request", "1")
        .send({
          name: firstMe.body.user.name,
          active: false,
          isAdmin: true,
          memberships: [],
        }),
    ]);
    const winner = results.find((result) => result.status === 200);
    const loser = results.find((result) => result.status !== 200);
    expect(winner?.status).toBe(200);
    expect(loser?.status).toBe(403);
    expect(loser?.body.message).toBe("Administrator access required");
    const checks = await Promise.all([
      request(app.getHttpServer())
        .get("/api/admin/users")
        .set("Cookie", firstCookie),
      request(app.getHttpServer())
        .get("/api/admin/users")
        .set("Cookie", secondCookie),
    ]);
    expect(checks.some((result) => result.status === 200)).toBe(true);
    const survivorCookie =
      checks[0].status === 200 ? firstCookie : secondCookie;
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${firstMe.body.user.id}`)
      .set("Cookie", survivorCookie)
      .set("X-WMS-Request", "1")
      .send({
        name: firstMe.body.user.name,
        active: true,
        isAdmin: true,
        memberships: [],
      })
      .expect(200);
  });

  test("an admin reset wins over an in-flight password change", async () => {
    const admin = await adminCookie();
    const created = await request(app.getHttpServer())
      .post("/api/admin/users")
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({
        username: "race.user",
        name: "Race User",
        password: "Temporary-race-123!",
        isAdmin: false,
        memberships: [],
      })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({ username: "race.user", password: "Temporary-race-123!" })
      .expect(201);
    const temporaryCookie = login.headers["set-cookie"][0].split(";")[0];
    const firstChange = await request(app.getHttpServer())
      .post("/api/auth/password")
      .set("Cookie", temporaryCookie)
      .set("X-WMS-Request", "1")
      .send({
        currentPassword: "Temporary-race-123!",
        newPassword: "Established-race-123!",
      })
      .expect(201);
    const userCookie = firstChange.headers["set-cookie"][0].split(";")[0];

    let markEntered!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const originalTransaction = Database.prototype.transaction;
    let intercept = true;
    const transactionSpy = vi
      .spyOn(Database.prototype, "transaction")
      .mockImplementation(async function (work) {
        if (intercept) {
          intercept = false;
          markEntered();
          await barrier;
        }
        return originalTransaction.call(this, work);
      });

    const changePromise = request(app.getHttpServer())
      .post("/api/auth/password")
      .set("Cookie", userCookie)
      .set("X-WMS-Request", "1")
      .send({
        currentPassword: "Established-race-123!",
        newPassword: "Candidate-race-123!",
      })
      .then((response) => response);
    await entered;
    const reset = await request(app.getHttpServer())
      .post(`/api/admin/users/${created.body.id}/reset-password`)
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({ password: "Admin-reset-race-123!" });
    release();
    const change = await changePromise;
    transactionSpy.mockRestore();
    expect(reset.status).toBe(201);
    expect(change.status).toBe(401);
    expect(change.body.message).toBe("Unauthorized");
    const resetLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({ username: "race.user", password: "Admin-reset-race-123!" })
      .expect(201);
    expect(resetLogin.body.user.mustChangePassword).toBe(true);
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({ username: "race.user", password: "Candidate-race-123!" })
      .expect(401);
  });

  test("an admin reset prevents an already-verified login from issuing a session", async () => {
    const admin = await adminCookie();
    const created = await request(app.getHttpServer())
      .post("/api/admin/users")
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({
        username: "login.race",
        name: "Login Race",
        password: "Login-before-reset-123!",
        isAdmin: false,
        memberships: [],
      })
      .expect(201);

    let markEntered!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const originalTransaction = Database.prototype.transaction;
    let intercept = true;
    const transactionSpy = vi
      .spyOn(Database.prototype, "transaction")
      .mockImplementation(async function (work) {
        if (intercept) {
          intercept = false;
          markEntered();
          await barrier;
        }
        return originalTransaction.call(this, work);
      });

    const loginPromise = request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .send({ username: "login.race", password: "Login-before-reset-123!" })
      .then((response) => response);
    await entered;
    await request(app.getHttpServer())
      .post(`/api/admin/users/${created.body.id}/reset-password`)
      .set("Cookie", admin)
      .set("X-WMS-Request", "1")
      .send({ password: "Login-after-reset-123!" })
      .expect(201);
    release();
    const login = await loginPromise;
    transactionSpy.mockRestore();
    expect(login.status).toBe(401);
    expect(login.body.message).toBe("Invalid username or password");
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", login.headers["set-cookie"]?.[0] ?? "wms_session=missing")
      .expect(401);
  });

  test("rejects unsafe requests without the CSRF header or with a foreign origin", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ username: "nobody", password: "not-valid" })
      .expect(403);
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-WMS-Request", "1")
      .set("Origin", "https://attacker.invalid")
      .send({ username: "nobody", password: "not-valid" })
      .expect(403);
  });

  test("restart preserves edited role permissions and an existing admin password hash", async () => {
    const previous = process.env.DATABASE_SCHEMA;
    const schema = `test_restart_${Date.now()}`;
    process.env.DATABASE_SCHEMA = schema;
    const first = new Database();
    await first.initialize();
    await first.query("DELETE FROM role_permissions WHERE role_id='manager'");
    await first.query(
      "UPDATE users SET password_hash='existing-hash' WHERE is_admin",
    );
    await first.close();
    const second = new Database();
    await second.initialize();
    expect(
      (
        await second.query(
          "SELECT permission_id FROM role_permissions WHERE role_id='manager'",
        )
      ).rows,
    ).toEqual([]);
    expect(
      (await second.query("SELECT password_hash FROM users WHERE is_admin"))
        .rows[0].password_hash,
    ).toBe("existing-hash");
    await second.query(`DROP SCHEMA "${schema}" CASCADE`);
    await second.close();
    if (previous === undefined) delete process.env.DATABASE_SCHEMA;
    else process.env.DATABASE_SCHEMA = previous;
  });
});
