import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { Database } from "../src/db";
import { UsersRepository } from "../src/users/users.repository";
import { SessionsRepository } from "../src/auth/sessions.repository";

test("concurrent upgrade initialization applies identities once and preserves one bootstrap account", async () => {
  const db = await legacyFixture();
  try {
    await Promise.all([db.initialize(), db.initialize()]);
    expect(
      (await db.query("SELECT version FROM schema_migrations WHERE version=3"))
        .rowCount,
    ).toBe(1);
    expect(
      (
        await db.query("SELECT id FROM users WHERE lower(username)=lower($1)", [
          process.env.ADMIN_USERNAME,
        ])
      ).rowCount,
    ).toBe(1);
    expect(
      (await db.query("SELECT count(DISTINCT id) count FROM projects")).rows[0]
        .count,
    ).toBe("3");
  } finally {
    await db.close();
  }
});

async function legacyFixture() {
  const db = new Database({ testing: true });
  await db.query(`CREATE SCHEMA "${db.schema}"`);
  await db.query("CREATE TABLE schema_migrations(version integer PRIMARY KEY)");
  for (const [version, file] of [
    [1, "001_module1.sql"],
    [2, "002_project_setup.sql"],
  ] as const) {
    await db.query(await readFile(resolve("migrations", file), "utf8"));
    await db.query("INSERT INTO schema_migrations VALUES ($1)", [version]);
  }
  await db.query(
    "INSERT INTO users(id,username,name,password_hash,must_change_password) VALUES ('legacy-user','legacy.user','Legacy user','unchanged-hash',false)",
  );
  await db.query(
    "INSERT INTO memberships VALUES ('legacy-user','apo','manager'),('legacy-user','squ','operator')",
  );
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ('existing-token-hash','legacy-user',now()+interval '1 hour')",
  );
  await db.query(
    "INSERT INTO warehouses(id,code,name) VALUES ('old-warehouse','WH-01','Shared warehouse')",
  );
  await db.query(
    "INSERT INTO project_warehouses VALUES ('apo','old-warehouse',true,true,false),('squ','old-warehouse',true,false,true)",
  );
  await db.query(
    "UPDATE projects SET updated_by='legacy-user',version=7,first_transaction_at='2026-09-01' WHERE id='apo'",
  );
  await db.query(
    "INSERT INTO project_audit(project_id,actor_id,actor_name,section,before_value,after_value) VALUES ('apo','legacy-user','Legacy user','warehouses','{}','{\"warehouseIds\":[\"old-warehouse\"]}')",
  );
  return db;
}

test("migrates populated text identities to bigint keys while preserving public relationships", async () => {
  const db = await legacyFixture();
  try {
    await db.initialize();
    const columns = (
      await db.query<{
        table_name: string;
        data_type: string;
        is_identity: string;
      }>(
        "SELECT table_name,data_type,is_identity FROM information_schema.columns WHERE table_schema=$1 AND column_name='id' AND table_name=ANY($2) ORDER BY table_name",
        [db.schema, ["users", "projects", "clients", "warehouses"]],
      )
    ).rows;
    expect(columns).toEqual(
      ["clients", "projects", "users", "warehouses"].map((table_name) => ({
        table_name,
        data_type: "bigint",
        is_identity: "YES",
      })),
    );
    expect(
      (
        await db.query(
          "SELECT u.public_id,p.public_id project,m.role_id FROM memberships m JOIN users u ON u.id=m.user_id JOIN projects p ON p.id=m.project_id ORDER BY p.public_id",
        )
      ).rows,
    ).toEqual([
      { public_id: "legacy-user", project: "apo", role_id: "manager" },
      { public_id: "legacy-user", project: "squ", role_id: "operator" },
    ]);
    expect(
      (
        await db.query(
          "SELECT p.public_id project,w.public_id warehouse,pw.is_default,pw.has_stock,pw.has_open_work FROM project_warehouses pw JOIN projects p ON p.id=pw.project_id JOIN warehouses w ON w.id=pw.warehouse_id ORDER BY p.public_id",
        )
      ).rows,
    ).toEqual([
      {
        project: "apo",
        warehouse: "old-warehouse",
        is_default: true,
        has_stock: true,
        has_open_work: false,
      },
      {
        project: "squ",
        warehouse: "old-warehouse",
        is_default: true,
        has_stock: false,
        has_open_work: true,
      },
    ]);
    expect(
      (
        await db.query(
          "SELECT u.public_id,u.password_hash,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id",
        )
      ).rows,
    ).toEqual([
      {
        public_id: "legacy-user",
        password_hash: "unchanged-hash",
        token_hash: "existing-token-hash",
      },
    ]);
    expect(
      (
        await db.query(
          "SELECT p.public_id project,u.public_id actor,a.after_value FROM project_audit a JOIN projects p ON p.id=a.project_id JOIN users u ON u.id=a.actor_id",
        )
      ).rows,
    ).toEqual([
      {
        project: "apo",
        actor: "legacy-user",
        after_value: { warehouseIds: ["old-warehouse"] },
      },
    ]);
    const project = (
      await db.query(
        "SELECT p.version,u.public_id updater,p.first_transaction_at,c.public_id client FROM projects p JOIN clients c ON c.id=p.client_id LEFT JOIN users u ON u.id=p.updated_by WHERE p.public_id='apo'",
      )
    ).rows[0];
    expect(project).toMatchObject({
      version: 7,
      updater: "legacy-user",
      client: expect.stringMatching(/^legacy-/),
    });
    expect(project.first_transaction_at.toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
    expect(
      (await db.query("SELECT updated_by FROM projects WHERE public_id='squ'"))
        .rows[0].updated_by,
    ).toBeNull();
    expect(
      (
        await db.query(
          "SELECT s.lot,s.expiry,s.inspection FROM project_settings s JOIN projects p ON p.id=s.project_id WHERE p.public_id='apo'",
        )
      ).rows[0],
    ).toEqual({ lot: "item", expiry: "item", inspection: true });
    const before = (
      await db.query("SELECT id,public_id FROM projects ORDER BY id")
    ).rows;
    await db.initialize();
    expect(
      (await db.query("SELECT id,public_id FROM projects ORDER BY id")).rows,
    ).toEqual(before);
    expect(
      (await db.query("SELECT version FROM schema_migrations ORDER BY version"))
        .rows,
    ).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }]);
  } finally {
    await db.close();
  }
});

test("migration failure restores the complete legacy schema and allows a safe retry", async () => {
  const db = await legacyFixture();
  try {
    await db.query(
      "CREATE TABLE external_reference(user_id text REFERENCES users(id))",
    );
    await db.query("INSERT INTO external_reference VALUES ('legacy-user')");
    await expect(db.initialize()).rejects.toMatchObject({ code: "2BP01" });
    expect(
      (
        await db.query(
          "SELECT data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name='users' AND column_name='id'",
          [db.schema],
        )
      ).rows[0].data_type,
    ).toBe("text");
    expect(
      (
        await db.query(
          "SELECT user_id FROM sessions WHERE token_hash='existing-token-hash'",
        )
      ).rows[0].user_id,
    ).toBe("legacy-user");
    expect(
      (await db.query("SELECT version FROM schema_migrations ORDER BY version"))
        .rows,
    ).toEqual([{ version: 1 }, { version: 2 }]);
    await db.query("DROP TABLE external_reference");
    await db.initialize();
    expect(
      (
        await db.query(
          "SELECT public_id FROM users WHERE username='legacy.user'",
        )
      ).rows[0].public_id,
    ).toBe("legacy-user");
  } finally {
    await db.close();
  }
});

test("numeric references retain constraints, delete actions and supporting indexes", async () => {
  const db = await legacyFixture();
  try {
    await db.initialize();
    const fks = (
      await db.query<{
        convalidated: boolean;
        data_type: string;
        confdeltype: string;
      }>(
        `SELECT c.convalidated,format_type(a.atttypid,a.atttypmod) data_type,c.confdeltype
       FROM pg_constraint c JOIN pg_class parent ON parent.oid=c.confrelid
       JOIN pg_namespace n ON n.oid=parent.relnamespace
       JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
       WHERE c.contype='f' AND n.nspname=$1 AND parent.relname=ANY($2)`,
        [db.schema, ["users", "projects", "clients", "warehouses"]],
      )
    ).rows;
    expect(fks).toHaveLength(10);
    expect(fks.every((f) => f.convalidated && f.data_type === "bigint")).toBe(
      true,
    );
    expect(fks.filter((f) => f.confdeltype === "c")).toHaveLength(3);
    await expect(
      db.query(
        "INSERT INTO project_settings(project_id) VALUES (9223372036854775807)",
      ),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      db.query(
        "INSERT INTO warehouses(public_id,code,name) VALUES ('old-warehouse','OTHER','Duplicate public identity')",
      ),
    ).rejects.toMatchObject({ code: "23505" });
    await db.query(
      "INSERT INTO warehouses(code,name) VALUES ('SECOND','Second')",
    );
    await expect(
      db.query(
        "INSERT INTO project_warehouses(project_id,warehouse_id,is_default) SELECT p.id,w.id,true FROM projects p,warehouses w WHERE p.public_id='apo' AND w.code='SECOND'",
      ),
    ).rejects.toMatchObject({ code: "23505" });
    await db.query(
      "INSERT INTO users(public_id,username,name,password_hash) VALUES ('cascade-user','cascade.user','Test','hash')",
    );
    await db.query(
      "INSERT INTO memberships(user_id,project_id,role_id) SELECT u.id,p.id,'operator' FROM users u,projects p WHERE u.public_id='cascade-user' AND p.public_id='apo'",
    );
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at) SELECT 'cascade-token',id,now() FROM users WHERE public_id='cascade-user'",
    );
    await db.query("DELETE FROM users WHERE public_id='cascade-user'");
    expect(
      (
        await db.query(
          "SELECT 1 FROM sessions WHERE token_hash='cascade-token'",
        )
      ).rowCount,
    ).toBe(0);
    expect((await db.query("SELECT 1 FROM memberships")).rowCount).toBe(2);
    const indexes = (
      await db.query<{ indexname: string }>(
        "SELECT indexname FROM pg_indexes WHERE schemaname=$1",
        [db.schema],
      )
    ).rows.map((i) => i.indexname);
    for (const name of [
      "memberships_project_user_idx",
      "sessions_user_idx",
      "project_warehouses_warehouse_idx",
      "projects_client_idx",
      "project_audit_history_idx",
      "project_single_default_idx",
    ])
      expect(indexes).toContain(name);
  } finally {
    await db.close();
  }
});

test("DB allocates concurrent identities and repositories preserve IDs above Number precision", async () => {
  const db = await legacyFixture();
  try {
    await db.initialize();
    await db.query(
      "SELECT setval(pg_get_serial_sequence('users','id'),9007199254740993,false)",
    );
    const users = new UsersRepository(db),
      sessions = new SessionsRepository(db);
    const ids = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        db.transaction((c) =>
          users.create(
            `precision.${index}`,
            `User ${index}`,
            "test-hash",
            false,
            c,
          ),
        ),
      ),
    );
    expect(new Set(ids).size).toBe(8);
    expect(
      ids.every((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          id,
        ),
      ),
    ).toBe(true);
    const stored = (
      await db.query<{ id: string; public_id: string }>(
        "SELECT id,public_id FROM users WHERE username LIKE 'precision.%' ORDER BY id",
      )
    ).rows;
    expect(stored.map((r) => r.id)).toEqual(
      Array.from({ length: 8 }, (_, i) =>
        (9007199254740993n + BigInt(i)).toString(),
      ),
    );
    for (const row of stored)
      expect((await users.find(row.public_id))?.id).toBe(row.public_id);
    await db.transaction(async (c) => {
      await users.addMemberships(
        ids[0],
        [{ projectId: "apo", roleId: "operator" }],
        c,
      );
      await sessions.issue("precision-token", ids[0], c);
    });
    expect((await sessions.current("precision-token"))?.id).toBe(ids[0]);
    expect(await users.memberships(ids[0])).toEqual([
      { projectId: "apo", roleId: "operator" },
    ]);
    expect((await sessions.current("existing-token-hash"))?.id).toBe(
      "legacy-user",
    );
  } finally {
    await db.close();
  }
});
