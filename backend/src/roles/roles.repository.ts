import { Inject, Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { Database } from "../db";
import { Role, Permission, RoleId } from "../common/models";
@Injectable()
export class RolesRepository {
  constructor(@Inject(Database) private readonly db: Database) {}
  async list(): Promise<Role[]> {
    return (
      await this.db.query<Role>(
        `SELECT r.id,r.name,coalesce(array_agg(rp.permission_id) FILTER(WHERE rp.permission_id IS NOT NULL),'{}') permissions FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id GROUP BY r.id ORDER BY r.name`,
      )
    ).rows;
  }
  async permissions(): Promise<Permission[]> {
    return (
      await this.db.query<Permission>(
        "SELECT id,name FROM permissions ORDER BY id",
      )
    ).rows;
  }
  async replace(
    id: RoleId,
    permissions: string[],
    client: PoolClient,
  ): Promise<void> {
    await client.query("DELETE FROM role_permissions WHERE role_id=$1", [id]);
    for (const permission of permissions)
      await client.query(
        "INSERT INTO role_permissions(role_id,permission_id) VALUES ($1,$2)",
        [id, permission],
      );
  }
  async name(id: RoleId): Promise<string> {
    return (
      await this.db.query<{ name: string }>(
        "SELECT name FROM roles WHERE id=$1",
        [id],
      )
    ).rows[0].name;
  }
}
