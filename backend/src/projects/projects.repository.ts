import { Inject, Injectable } from "@nestjs/common";
import { Database } from "../db";
import { Project, RoleId, AccessibleProject } from "../common/models";
interface AssignedProjectRow extends Project {
  role_id: RoleId;
  role_name: string;
  permissions: string[];
}
@Injectable()
export class ProjectsRepository {
  constructor(@Inject(Database) private readonly db: Database) {}
  async list(): Promise<Project[]> {
    return (
      await this.db.query<Project>(
        "SELECT id,code,name,client,description,accent FROM projects ORDER BY name",
      )
    ).rows;
  }
  async find(id: string): Promise<Project | undefined> {
    return (
      await this.db.query<Project>("SELECT * FROM projects WHERE id=$1", [id])
    ).rows[0];
  }
  async assigned(userId: string): Promise<AccessibleProject[]> {
    const result = await this.db.query<AssignedProjectRow>(
      `SELECT p.id,p.code,p.name,p.client,p.description,p.accent,m.role_id,"r".name role_name,coalesce(array_agg(rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL),'{}') permissions FROM projects p JOIN memberships m ON m.project_id=p.id JOIN roles "r" ON "r".id=m.role_id LEFT JOIN role_permissions rp ON rp.role_id=m.role_id WHERE m.user_id=$1 GROUP BY p.id,m.role_id,"r".name ORDER BY p.name`,
      [userId],
    );
    return result.rows.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      client: p.client,
      description: p.description,
      accent: p.accent,
      roleId: p.role_id,
      roleName: p.role_name,
      permissions: p.permissions,
    }));
  }
}
