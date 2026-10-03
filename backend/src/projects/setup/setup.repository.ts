import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { CreateProjectInput, GeneralInput, MembersInput } from "./setup.dto";
import {
  ReferenceItem,
  SetupProject,
  SetupMember,
  SetupAudit,
  SetupActor,
  SetupRules,
  ProjectStatus,
  SetupSummary,
} from "./setup.model";
@Injectable()
export class SetupRepository {
  async serialize(c: PoolClient) {
    await c.query("SELECT pg_advisory_xact_lock(8675309)");
  }
  async actor(id: string, c: PoolClient): Promise<SetupActor | undefined> {
    return (
      await c.query<SetupActor>(
        "SELECT id,name,is_admin,active,must_change_password FROM users WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
  }
  async isManager(id: string, actorId: string, c: PoolClient) {
    return Boolean(
      (
        await c.query(
          "SELECT 1 FROM memberships WHERE project_id=$1 AND user_id=$2 AND role_id='manager'",
          [id, actorId],
        )
      ).rowCount,
    );
  }
  async references(
    kind: "clients" | "warehouses",
    c: PoolClient,
  ): Promise<ReferenceItem[]> {
    return (
      await c.query<ReferenceItem>(
        `SELECT id,code,name FROM ${kind} ORDER BY name`,
      )
    ).rows;
  }
  async users(c: PoolClient) {
    return (
      await c.query<{
        id: string;
        username: string;
        name: string;
        active: boolean;
      }>("SELECT id,username,name,active FROM users ORDER BY username")
    ).rows;
  }
  async members(id: string, c: PoolClient): Promise<SetupMember[]> {
    return (
      await c.query<SetupMember>(
        'SELECT u.id "userId",u.username,u.name,u.active,m.role_id "roleId" FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.project_id=$1 ORDER BY u.id',
        [id],
      )
    ).rows;
  }
  async project(id: string, c: PoolClient): Promise<SetupProject | undefined> {
    const p = (
      await c.query<SetupProject>(
        `SELECT p.id,p.code,p.name,p.description,p.accent,p.status,p.version,p.client_id "clientId",cl.name client,p.updated_at "updatedAt",u.name "updatedBy",p.first_transaction_at "firstTransactionAt",json_build_object('lot',s.lot,'expiry',s.expiry,'inspection',s.inspection) rules FROM projects p JOIN clients cl ON cl.id=p.client_id JOIN project_settings s ON s.project_id=p.id LEFT JOIN users u ON u.id=p.updated_by WHERE p.id=$1 FOR UPDATE OF p`,
        [id],
      )
    ).rows[0];
    if (!p) return undefined;
    const links = await this.warehouseUsage(id, c);
    p.warehouseIds = links.map((l) => l.id);
    p.defaultWarehouseId = links.find((l) => l.isDefault)?.id ?? null;
    return p;
  }
  async warehouseUsage(id: string, c: PoolClient) {
    return (
      await c.query<{
        id: string;
        isDefault: boolean;
        hasStock: boolean;
        hasOpenWork: boolean;
      }>(
        'SELECT warehouse_id id,is_default "isDefault",has_stock "hasStock",has_open_work "hasOpenWork" FROM project_warehouses WHERE project_id=$1 ORDER BY warehouse_id',
        [id],
      )
    ).rows;
  }
  async history(id: string, c: PoolClient): Promise<SetupAudit[]> {
    return (
      await c.query<SetupAudit>(
        'SELECT id::text,section,actor_name "actorName",created_at "createdAt",before_value "before",after_value "after" FROM project_audit WHERE project_id=$1 ORDER BY id DESC',
        [id],
      )
    ).rows;
  }
  async list(c: PoolClient) {
    return (
      await c.query<SetupSummary>(
        'SELECT p.id,p.code,p.name,p.description,p.accent,p.status,p.client_id "clientId",cl.name client,p.version,p.updated_at "updatedAt",(SELECT count(*)::integer FROM project_warehouses w WHERE w.project_id=p.id) "warehouseCount" FROM projects p JOIN clients cl ON cl.id=p.client_id ORDER BY p.name',
      )
    ).rows;
  }
  async create(
    id: string,
    input: CreateProjectInput,
    actorId: string,
    c: PoolClient,
  ) {
    await c.query(
      "INSERT INTO projects(id,code,name,client,client_id,description,accent,status,updated_by) SELECT $1,$2,$3,name,id,$5,$6,'draft',$7 FROM clients WHERE id=$4",
      [
        id,
        input.code,
        input.name,
        input.clientId,
        input.description,
        input.accent,
        actorId,
      ],
    );
    await c.query("INSERT INTO project_settings(project_id) VALUES ($1)", [id]);
  }
  async general(
    id: string,
    input: GeneralInput,
    clientId: string,
    c: PoolClient,
  ) {
    await c.query(
      "UPDATE projects SET name=$2,description=$3,accent=$4,client_id=$5,client=(SELECT name FROM clients WHERE id=$5) WHERE id=$1",
      [id, input.name, input.description, input.accent, clientId],
    );
  }
  async warehouses(
    id: string,
    ids: string[],
    defaultId: string | null,
    c: PoolClient,
  ) {
    await c.query(
      "DELETE FROM project_warehouses WHERE project_id=$1 AND NOT (warehouse_id=ANY($2::text[]))",
      [id, ids],
    );
    await c.query(
      "UPDATE project_warehouses SET is_default=false WHERE project_id=$1",
      [id],
    );
    for (const warehouseId of ids)
      await c.query(
        "INSERT INTO project_warehouses(project_id,warehouse_id,is_default) VALUES ($1,$2,$3) ON CONFLICT(project_id,warehouse_id) DO UPDATE SET is_default=excluded.is_default",
        [id, warehouseId, warehouseId === defaultId],
      );
  }
  async rules(id: string, rules: SetupRules, c: PoolClient) {
    await c.query(
      "UPDATE project_settings SET lot=$2,expiry=$3,inspection=$4 WHERE project_id=$1",
      [id, rules.lot, rules.expiry, rules.inspection],
    );
  }
  async setMembers(
    id: string,
    members: MembersInput["members"],
    c: PoolClient,
  ) {
    await c.query("DELETE FROM memberships WHERE project_id=$1", [id]);
    for (const m of members)
      await c.query(
        "INSERT INTO memberships(project_id,user_id,role_id) VALUES ($1,$2,$3)",
        [id, m.userId, m.roleId],
      );
  }
  async status(id: string, status: ProjectStatus, c: PoolClient) {
    await c.query("UPDATE projects SET status=$2 WHERE id=$1", [id, status]);
  }
  async audit(
    id: string,
    actor: Pick<SetupActor, "id" | "name">,
    section: string,
    before: unknown,
    after: unknown,
    c: PoolClient,
    bump = true,
  ) {
    if (bump)
      await c.query(
        "UPDATE projects SET version=version+1,updated_at=now(),updated_by=$2 WHERE id=$1",
        [id, actor.id],
      );
    await c.query(
      "INSERT INTO project_audit(project_id,actor_id,actor_name,section,before_value,after_value) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)",
      [
        id,
        actor.id,
        actor.name,
        section,
        JSON.stringify(before),
        JSON.stringify(after),
      ],
    );
  }
}
