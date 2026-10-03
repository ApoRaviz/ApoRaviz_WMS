import { Inject, Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { Database } from "../db";
import { Membership } from "../common/models";
import { UserRow } from "./user.entity";
import { UpdateUserDto } from "./users.dto";
@Injectable()
export class UsersRepository {
  constructor(@Inject(Database) private readonly db: Database) {}
  async find(id: string): Promise<UserRow | undefined> {
    return (
      await this.db.query<UserRow>(
        "SELECT public_id id,username,name,password_hash,is_admin,active,must_change_password FROM users WHERE public_id=$1",
        [id],
      )
    ).rows[0];
  }
  async findByUsername(username: string): Promise<UserRow | undefined> {
    return (
      await this.db.query<UserRow>(
        "SELECT public_id id,username,name,password_hash,is_admin,active,must_change_password FROM users WHERE lower(username)=lower($1)",
        [username],
      )
    ).rows[0];
  }
  async lock(id: string, client: PoolClient): Promise<UserRow | undefined> {
    return (
      await client.query<UserRow>(
        "SELECT public_id id,username,name,password_hash,is_admin,active,must_change_password FROM users WHERE public_id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
  }
  async listIds(): Promise<string[]> {
    return (
      await this.db.query<{ id: string }>(
        "SELECT public_id id FROM users ORDER BY username",
      )
    ).rows.map((row) => row.id);
  }
  async memberships(id: string, client?: PoolClient): Promise<Membership[]> {
    const sql =
      'SELECT p.public_id "projectId",m.role_id "roleId" FROM memberships m JOIN projects p ON p.id=m.project_id WHERE m.user_id=(SELECT id FROM users WHERE public_id=$1) ORDER BY p.public_id';
    return (
      client
        ? await client.query<Membership>(sql, [id])
        : await this.db.query<Membership>(sql, [id])
    ).rows;
  }
  async create(
    username: string,
    name: string,
    passwordHash: string,
    isAdmin: boolean,
    client: PoolClient,
  ): Promise<string> {
    return (
      await client.query<{ id: string }>(
        "INSERT INTO users(username,name,password_hash,is_admin) VALUES ($1,$2,$3,$4) RETURNING public_id id",
        [username, name, passwordHash, isAdmin],
      )
    ).rows[0].id;
  }
  async projectsExist(ids: string[], client: PoolClient): Promise<boolean> {
    const result = await client.query<{ count: number }>(
      "SELECT count(*)::integer count FROM projects WHERE public_id=ANY($1::text[])",
      [ids],
    );
    return result.rows[0].count === ids.length;
  }
  async addMemberships(
    id: string,
    memberships: Membership[],
    client: PoolClient,
  ): Promise<void> {
    for (const m of memberships)
      await client.query(
        "INSERT INTO memberships(user_id,project_id,role_id) VALUES ((SELECT id FROM users WHERE public_id=$1),(SELECT id FROM projects WHERE public_id=$2),$3)",
        [id, m.projectId, m.roleId],
      );
  }
  async replaceMemberships(
    id: string,
    memberships: Membership[],
    client: PoolClient,
  ): Promise<void> {
    await client.query(
      "DELETE FROM memberships WHERE user_id=(SELECT id FROM users WHERE public_id=$1)",
      [id],
    );
    await this.addMemberships(id, memberships, client);
  }
  async lockAdministrators(client: PoolClient): Promise<void> {
    await client.query("SELECT pg_advisory_xact_lock(8675309)");
  }
  async countLockedActiveAdministrators(client: PoolClient): Promise<number> {
    return (
      (
        await client.query(
          "SELECT id FROM users WHERE is_admin AND active FOR UPDATE",
        )
      ).rowCount ?? 0
    );
  }
  async update(
    id: string,
    input: UpdateUserDto,
    client: PoolClient,
  ): Promise<void> {
    await client.query(
      "UPDATE users SET name=$1,active=$2,is_admin=$3 WHERE public_id=$4",
      [input.name, input.active, input.isAdmin, id],
    );
  }
  async setPassword(
    id: string,
    hash: string,
    mustChange: boolean,
    client: PoolClient,
  ): Promise<void> {
    await client.query(
      "UPDATE users SET password_hash=$1,must_change_password=$2 WHERE public_id=$3",
      [hash, mustChange, id],
    );
  }
}
