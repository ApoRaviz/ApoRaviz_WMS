import { Inject, Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { Database } from "../db";
import { UserRow } from "../users/user.entity";
@Injectable()
export class SessionsRepository {
  constructor(@Inject(Database) private readonly db: Database) {}
  async current(hash: string): Promise<UserRow | undefined> {
    return (
      await this.db.query<UserRow>(
        `SELECT u.public_id id,u.username,u.name,u.password_hash,u.is_admin,u.active,u.must_change_password FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,
        [hash],
      )
    ).rows[0];
  }
  async lockCurrent(
    hash: string,
    client: PoolClient,
  ): Promise<UserRow | undefined> {
    return (
      await client.query<UserRow>(
        `SELECT u.public_id id,u.username,u.name,u.password_hash,u.is_admin,u.active,u.must_change_password FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() FOR UPDATE OF u,s`,
        [hash],
      )
    ).rows[0];
  }
  async issue(hash: string, userId: string, client: PoolClient): Promise<void> {
    await client.query(
      `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,(SELECT id FROM users WHERE public_id=$2),now()+interval '8 hours')`,
      [hash, userId],
    );
  }
  async revoke(hash: string): Promise<void> {
    await this.db.query("DELETE FROM sessions WHERE token_hash=$1", [hash]);
  }
  async revokeUser(id: string, client: PoolClient): Promise<void> {
    await client.query(
      "DELETE FROM sessions WHERE user_id=(SELECT id FROM users WHERE public_id=$1)",
      [id],
    );
  }
}
