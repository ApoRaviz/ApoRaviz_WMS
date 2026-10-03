import request from "supertest";
import { beforeAll, afterAll, describe, expect, test, vi } from "vitest";
import { createApp } from "../src/main";
import { Database } from "../src/db";
import { SetupRepository } from "../src/projects/setup/setup.repository";

describe("Project Setup API", () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let admin: string, manager: string, operator: string, managerId: string;
  let clientId: string, warehouseA: string, warehouseB: string;
  const write = (
    method: "post" | "patch",
    url: string,
    cookie: string,
    body: object,
  ) =>
    request(app.getHttpServer())
      [method](url)
      .set("Cookie", cookie)
      .set("X-WMS-Request", "1")
      .send(body);
  const read = (url: string, cookie = admin) =>
    request(app.getHttpServer()).get(url).set("Cookie", cookie);
  async function login(username: string, password: string) {
    const result = await write("post", "/api/auth/login", "", {
      username,
      password,
    }).expect(201);
    return result.headers["set-cookie"][0].split(";")[0];
  }
  async function user(username: string, roleId: string) {
    const result = await write("post", "/api/admin/users", admin, {
      username,
      name: username,
      password: "Temporary-password-123!",
      isAdmin: false,
      memberships: [{ projectId: "apo", roleId }],
    }).expect(201);
    const cookie = await login(username, "Temporary-password-123!");
    const changed = await write("post", "/api/auth/password", cookie, {
      currentPassword: "Temporary-password-123!",
      newPassword: "Changed-password-123!",
    }).expect(201);
    return {
      id: result.body.id,
      cookie: changed.headers["set-cookie"][0].split(";")[0],
    };
  }
  beforeAll(async () => {
    app = await createApp({ testing: true });
    const cookie = await login(
      process.env.ADMIN_USERNAME!,
      process.env.ADMIN_PASSWORD!,
    );
    const changed = await write("post", "/api/auth/password", cookie, {
      currentPassword: process.env.ADMIN_PASSWORD,
      newPassword: "Admin-changed-123!",
    }).expect(201);
    admin = changed.headers["set-cookie"][0].split(";")[0];
    const m = await user("setup.manager", "manager");
    manager = m.cookie;
    managerId = m.id;
    operator = (await user("setup.operator", "operator")).cookie;
  });
  afterAll(async () => {
    await app?.close();
  });
  async function create(code: string) {
    return (
      await write("post", "/api/admin/project-setup", admin, {
        code,
        name: code,
        clientId,
        description: "",
        accent: "violet",
      }).expect(201)
    ).body;
  }
  async function detail(id: string) {
    return (await read(`/api/projects/${id}/setup`).expect(200)).body;
  }

  test("prepares separate reference data and rejects non-admin writes", async () => {
    const catalog = await read("/api/admin/project-reference-data").expect(200);
    clientId = catalog.body.clients[0].id;
    warehouseA = (
      await write(
        "post",
        "/api/admin/project-reference-data/warehouses",
        admin,
        { code: "WH-A", name: "Warehouse A" },
      ).expect(201)
    ).body.id;
    warehouseB = (
      await write(
        "post",
        "/api/admin/project-reference-data/warehouses",
        admin,
        { code: "WH-B", name: "Warehouse B" },
      ).expect(201)
    ).body.id;
    await write("post", "/api/admin/project-reference-data/clients", manager, {
      code: "BAD",
      name: "No",
    }).expect(403);
    await write("post", "/api/admin/project-reference-data/warehouses", admin, {
      code: "wh-a",
      name: "Duplicate",
    }).expect(409);
  });
  test("creates draft with defaults, immutable normalized code and audited actor", async () => {
    const d = await create(" setup-one ");
    expect(d.project).toMatchObject({
      code: "SETUP-ONE",
      status: "draft",
      version: 1,
      rules: { lot: "item", expiry: "item", inspection: true },
    });
    expect(d.history[0]).toMatchObject({
      section: "created",
      actorName: expect.any(String),
    });
    await write("post", "/api/admin/project-setup", admin, {
      code: "setup-one",
      name: "dup",
      clientId,
      description: "",
      accent: "violet",
    }).expect(409);
    await write("patch", `/api/projects/${d.project.id}/setup/general`, admin, {
      version: 1,
      name: "Updated",
      description: "",
      accent: "blue",
      clientId,
      code: "CHANGED",
    }).expect(400);
  });
  test("shares warehouses, validates default and requires active manager for activation", async () => {
    const a = await create("SETUP-A"),
      b = await create("SETUP-B");
    for (const d of [a, b]) {
      const url = `/api/projects/${d.project.id}/setup`;
      await write("patch", url + "/status", admin, {
        version: 1,
        status: "active",
      }).expect(400);
      await write("patch", url + "/warehouses", admin, {
        version: 1,
        warehouseIds: [warehouseA],
        defaultWarehouseId: warehouseB,
      }).expect(400);
      const w = (
        await write("patch", url + "/warehouses", admin, {
          version: 1,
          warehouseIds: [warehouseA, warehouseB],
          defaultWarehouseId: warehouseA,
        }).expect(200)
      ).body;
      await write("patch", url + "/status", admin, {
        version: w.project.version,
        status: "active",
      }).expect(400);
      const m = (
        await write("patch", url + "/members", admin, {
          version: w.project.version,
          members: [{ userId: managerId, roleId: "manager" }],
        }).expect(200)
      ).body;
      const active = (
        await write("patch", url + "/status", admin, {
          version: m.project.version,
          status: "active",
        }).expect(200)
      ).body;
      expect(active.project.status).toBe("active");
      expect(active.project.warehouseIds).toContain(warehouseA);
    }
  });
  test("manager can edit own general/default only; denies cross-project and other roles", async () => {
    await read("/api/projects/apo/setup", operator).expect(403);
    await read("/api/projects/squ/setup", manager).expect(403);
    await write("post", "/api/admin/project-setup", manager, {
      code: "NO",
      name: "No",
      clientId,
      description: "",
      accent: "blue",
    }).expect(403);
    const d = await detail("apo");
    const url = "/api/projects/apo/setup";
    const updated = await write("patch", url + "/general", manager, {
      version: d.project.version,
      name: "Apo managed",
      description: "Manager edited",
      accent: "violet",
    }).expect(200);
    await write("patch", url + "/rules", manager, {
      version: updated.body.project.version,
      lot: "off",
      expiry: "off",
      inspection: false,
    }).expect(403);
    await write("patch", url + "/general", manager, {
      version: updated.body.project.version,
      name: "Apo",
      description: "",
      accent: "blue",
      clientId,
    }).expect(403);
    const w = await write("patch", url + "/warehouses", admin, {
      version: updated.body.project.version,
      warehouseIds: [warehouseA, warehouseB],
      defaultWarehouseId: warehouseA,
    }).expect(200);
    const changed = await write("patch", url + "/warehouses", manager, {
      version: w.body.project.version,
      defaultWarehouseId: warehouseB,
    }).expect(200);
    await write("patch", url + "/warehouses", manager, {
      version: changed.body.project.version,
      warehouseIds: [warehouseB],
      defaultWarehouseId: warehouseB,
    }).expect(403);
  });
  test("rejects stale writes and commits exactly one concurrent version with history", async () => {
    const d = await create("CONCURRENT");
    const url = `/api/projects/${d.project.id}/setup/general`;
    const results = await Promise.all(
      ["First", "Second"].map((name) =>
        write("patch", url, admin, {
          version: 1,
          name,
          description: "",
          accent: "blue",
          clientId,
        }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const after = await detail(d.project.id);
    expect(after.project.version).toBe(2);
    expect(after.history).toHaveLength(2);
    expect(after.history[0].before.name).toBe("CONCURRENT");
  });
  test("first-use lock and warehouse usage block destructive setting changes", async () => {
    const d = await create("LOCKED");
    const id = d.project.id;
    const url = `/api/projects/${id}/setup`;
    const w = await write("patch", url + "/warehouses", admin, {
      version: 1,
      warehouseIds: [warehouseA, warehouseB],
      defaultWarehouseId: warehouseA,
    }).expect(200);
    const db = app.get(Database);
    await db.query(
      "UPDATE projects SET first_transaction_at=now() WHERE public_id=$1",
      [id],
    );
    await db.query(
      "UPDATE project_warehouses SET has_stock=true WHERE project_id=(SELECT id FROM projects WHERE public_id=$1) AND warehouse_id=(SELECT id FROM warehouses WHERE public_id=$2)",
      [id, warehouseA],
    );
    const v = w.body.project.version;
    await write("patch", url + "/rules", admin, {
      version: v,
      lot: "off",
      expiry: "off",
      inspection: false,
    }).expect(409);
    const other = (
      await write("post", "/api/admin/project-reference-data/clients", admin, {
        code: "OTHER",
        name: "Other client",
      }).expect(201)
    ).body.id;
    await write("patch", url + "/general", admin, {
      version: v,
      name: "Locked",
      description: "",
      accent: "blue",
      clientId: other,
    }).expect(409);
    await write("patch", url + "/warehouses", admin, {
      version: v,
      warehouseIds: [warehouseB],
      defaultWarehouseId: warehouseB,
    }).expect(409);
    await write("patch", url + "/status", admin, {
      version: v,
      status: "inactive",
    }).expect(409);
    const after = await detail(id);
    expect(after.project.version).toBe(v);
    expect(after.history).toHaveLength(2);
  });
  test("existing user editor membership changes update setup audit and invalidate stale versions", async () => {
    const before = await detail("apo");
    const target = (await read("/api/admin/users")).body.find(
      (u: { id: string }) => u.id === managerId,
    );
    await write("patch", `/api/admin/users/${managerId}`, admin, {
      name: target.name,
      expectedMemberships: target.memberships,
      active: true,
      isAdmin: false,
      memberships: target.memberships.filter(
        (m: { projectId: string }) => m.projectId !== "apo",
      ),
    }).expect(200);
    const after = await detail("apo");
    expect(after.project.version).toBe(before.project.version + 1);
    expect(after.history[0].section).toBe("members");
    expect(
      after.members.some((m: { userId: string }) => m.userId === managerId),
    ).toBe(false);
    await write("patch", "/api/projects/apo/setup/general", admin, {
      version: before.project.version,
      name: "stale",
      description: "",
      accent: "blue",
      clientId,
    }).expect(409);
  });
  test("drafts and inactive projects remain configurable but cannot enter operational workspace", async () => {
    const d = await create("DRAFT-ACCESS");
    await read(`/api/projects/${d.project.id}/workspace`).expect(403);
    await read(`/api/projects/${d.project.id}/setup`).expect(200);
  });
  test("rolls back data and version when audit persistence fails", async () => {
    const d = await create("AUDIT-ROLLBACK");
    const repo = app.get(SetupRepository);
    const original = repo.audit.bind(repo);
    const audit = vi
      .spyOn(repo, "audit")
      .mockImplementationOnce(async (...args) => {
        await original(...args);
        throw new Error("Simulated audit failure after writes");
      });
    try {
      await write(
        "patch",
        `/api/projects/${d.project.id}/setup/general`,
        admin,
        {
          version: d.project.version,
          name: "Must roll back",
          description: "",
          accent: "blue",
        },
      ).expect(500);
    } finally {
      audit.mockRestore();
    }
    const after = await detail(d.project.id);
    expect(after.project).toEqual(d.project);
    expect(after.history).toEqual(d.history);
  });
  test.each(["add", "change"])(
    "rejects stale Users membership snapshot after Setup %s",
    async (operation) => {
      const d = await create("STALE-" + operation);
      const member = await user("stale." + operation, "operator");
      let current = d;
      if (operation === "change") {
        current = (
          await write(
            "patch",
            `/api/projects/${d.project.id}/setup/members`,
            admin,
            {
              version: current.project.version,
              members: [{ userId: member.id, roleId: "manager" }],
            },
          ).expect(200)
        ).body;
      }
      const stale = (await read("/api/admin/users")).body.find(
        (u: { id: string }) => u.id === member.id,
      );
      const newer = (
        await write(
          "patch",
          `/api/projects/${d.project.id}/setup/members`,
          admin,
          {
            version: current.project.version,
            members: [{ userId: member.id, roleId: "operator" }],
          },
        ).expect(200)
      ).body;
      await write("patch", `/api/admin/users/${member.id}`, admin, {
        name: "Name-only edit from stale form",
        active: true,
        isAdmin: false,
        memberships: stale.memberships,
        expectedMemberships: stale.memberships,
      }).expect(409);
      const after = await detail(d.project.id);
      expect(after.members).toEqual(newer.members);
      expect(after.project.version).toBe(newer.project.version);
      expect(after.history).toEqual(newer.history);
    },
  );
  test("unknown public membership references fail without silently dropping assignments", async () => {
    const before = (await read("/api/admin/users")).body;
    await write("post", "/api/admin/users", admin, {
      username: "invalid.reference",
      name: "Invalid",
      password: "Temporary-password-123!",
      isAdmin: false,
      memberships: [{ projectId: "missing-project", roleId: "operator" }],
    }).expect(400);
    expect((await read("/api/admin/users")).body).toEqual(before);
    const d = await create("MISSING-REFERENCE");
    await write("patch", `/api/projects/${d.project.id}/setup/members`, admin, {
      version: 1,
      members: [{ userId: "missing-user", roleId: "manager" }],
    }).expect(400);
    const after = await detail(d.project.id);
    expect(after.project.version).toBe(1);
    expect(after.members).toEqual([]);
    expect(after.history).toHaveLength(1);
  });
});
