import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool, PoolClient, QueryResultRow } from "pg";
import { hashPassword } from "./security";

const schemaPattern = /^[a-z][a-z0-9_]*$/;

export class Database {
  readonly pool: Pool;
  readonly schema: string;
  readonly ownsSchema: boolean;

  constructor(options: { testing?: boolean } = {}) {
    const connectionString = options.testing
      ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
      : process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");
    const requested = options.testing
      ? `test_${randomUUID().replaceAll("-", "")}`
      : process.env.DATABASE_SCHEMA || "public";
    if (!schemaPattern.test(requested))
      throw new Error("DATABASE_SCHEMA must match /^[a-z][a-z0-9_]*$/");
    this.schema = requested;
    this.ownsSchema = Boolean(options.testing);
    this.pool = new Pool({
      connectionString,
      options: `-c search_path=${this.schema}`,
    });
  }

  async initialize(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);
    await this.pool.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const migrationPath = resolve(__dirname, "../migrations/001_module1.sql");
    const sql = await readFile(migrationPath, "utf8");
    await this.transaction(async (client) => {
      const inserted = await client.query(
        "INSERT INTO schema_migrations(version) VALUES (1) ON CONFLICT DO NOTHING RETURNING version",
      );
      if (inserted.rowCount) await client.query(sql);
    });
    await this.bootstrapAdmin();
  }

  private async bootstrapAdmin(): Promise<void> {
    const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME?.trim();
    if (!username || !password || !name)
      throw new Error(
        "ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_NAME are required",
      );
    const exists = await this.pool.query(
      "SELECT 1 FROM users WHERE lower(username)=lower($1)",
      [username],
    );
    if (!exists.rowCount)
      await this.pool.query(
        "INSERT INTO users(id,username,name,password_hash,is_admin) VALUES ($1,$2,$3,$4,true)",
        [randomUUID(), username, name, await hashPassword(password)],
      );
  }

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ) {
    return this.pool.query<T>(text, values);
  }

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.ownsSchema)
      await this.pool.query(`DROP SCHEMA IF EXISTS "${this.schema}" CASCADE`);
    await this.pool.end();
  }
}
