import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { Database } from "../src/db";

test("upgrades an existing Module 1 schema once without changing accounts or memberships", async () => {
  const db = new Database({ testing: true });
  try {
    await db.query(`CREATE SCHEMA "${db.schema}"`);
    await db.query(
      "CREATE TABLE schema_migrations(version integer PRIMARY KEY)",
    );
    await db.query(
      await readFile(resolve("migrations/001_module1.sql"), "utf8"),
    );
    await db.query("INSERT INTO schema_migrations(version) VALUES (1)");
    await db.query(
      "UPDATE projects SET name='Existing custom name' WHERE id='apo'",
    );
    await db.query(
      "INSERT INTO users(id,username,name,password_hash) VALUES ('legacy-user','legacy.user','Existing user','unchanged-test-hash')",
    );
    await db.query(
      "INSERT INTO memberships(user_id,project_id,role_id) VALUES ('legacy-user','apo','manager')",
    );
    await db.initialize();
    await db.initialize();
    expect(
      (await db.query("SELECT version FROM schema_migrations ORDER BY version"))
        .rows,
    ).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }]);
    expect(
      (
        await db.query(
          "SELECT name,status,client_id FROM projects WHERE public_id='apo'",
        )
      ).rows[0],
    ).toMatchObject({
      name: "Existing custom name",
      status: "active",
      client_id: expect.any(String),
    });
    expect(
      (
        await db.query(
          "SELECT password_hash FROM users WHERE public_id='legacy-user'",
        )
      ).rows[0].password_hash,
    ).toBe("unchanged-test-hash");
    expect(
      (
        await db.query(
          "SELECT role_id FROM memberships WHERE user_id=(SELECT id FROM users WHERE public_id='legacy-user') AND project_id=(SELECT id FROM projects WHERE public_id='apo')",
        )
      ).rows[0].role_id,
    ).toBe("manager");
    expect(
      (
        await db.query(
          "SELECT lot,expiry,inspection FROM project_settings WHERE project_id=(SELECT id FROM projects WHERE public_id='apo')",
        )
      ).rows[0],
    ).toEqual({ lot: "item", expiry: "item", inspection: true });
    expect((await db.query("SELECT * FROM project_warehouses")).rowCount).toBe(
      0,
    );
    expect((await db.query("SELECT * FROM clients")).rowCount).toBe(1);
  } finally {
    await db.close();
  }
});
