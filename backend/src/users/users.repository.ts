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
      await this.db.query<UserRow>("SELECT * FROM users WHERE id=$1", [id])
    ).rows[0];
  }
  async findByUsername(username: string): Promise<UserRow | undefined> {
    return (
      await this.db.query<UserRow>(
        "SELECT * FROM users WHERE lower(username)=lower($1)",
        [username],
      )
    ).rows[0];
  }
  async lock(id: string, client: PoolClient): Promise<UserRow | undefined> {
    return (
      await client.query<UserRow>(
        "SELECT * FROM users WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
  }
  async listIds(): Promise<string[]> {
    return (
      await this.db.query<{ id: string }>(
        "SELECT id FROM users ORDER BY username",
      )
    ).rows.map((row) => row.id);
  }
  async memberships(id: string): Promise<Membership[]> {
    return (
      await this.db.query<Membership>(
        'SELECT project_id "projectId",role_id "roleId" FROM memberships WHERE user_id=$1 ORDER BY project_id',
        [id],
      )
    ).rows;
  }
  async create(
    id: string,
    username: string,
    name: string,
    passwordHash: string,
    isAdmin: boolean,
    client: PoolClient,
  ): Promise<void> {
    await client.query(
      "INSERT INTO users(id,username,name,password_hash,is_admin) VALUES ($1,$2,$3,$4,$5)",
      [id, username, name, passwordHash, isAdmin],
    );
  }
  async addMemberships(
    id: string,
    memberships: Membership[],
    client: PoolClient,
  ): Promise<void> {
    for (const m of memberships)
      await client.query(
        "INSERT INTO memberships(user_id,project_id,role_id) VALUES ($1,$2,$3)",
        [id, m.projectId, m.roleId],
      );
  }
  async replaceMemberships(
    id: string,
    memberships: Membership[],
    client: PoolClient,
  ): Promise<void> {
    await client.query("DELETE FROM memberships WHERE user_id=$1", [id]);
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
      "UPDATE users SET name=$1,active=$2,is_admin=$3 WHERE id=$4",
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
      "UPDATE users SET password_hash=$1,must_change_password=$2 WHERE id=$3",
      [hash, mustChange, id],
    );
  }
}
