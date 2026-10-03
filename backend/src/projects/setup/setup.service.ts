import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PoolClient } from "pg";
import { Database } from "../../db";
import { databaseErrorCode, fail } from "../../common/errors";
import { SetupRepository } from "./setup.repository";
import {
  CreateProjectInput,
  GeneralInput,
  WarehousesInput,
  RulesInput,
  MembersInput,
  StatusInput,
} from "./setup.dto";
import { SetupActor, SetupDetail, SetupProject } from "./setup.model";
@Injectable()
export class SetupService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(SetupRepository) private readonly repo: SetupRepository,
  ) {}
  private async actor(actorId: string, c: PoolClient, admin = false) {
    await this.repo.serialize(c);
    const actor = await this.repo.actor(actorId, c);
    if (
      !actor?.active ||
      actor.must_change_password ||
      (admin && !actor.is_admin)
    )
      fail(403, "ไม่มีสิทธิ์จัดการโปรเจกต์");
    return actor;
  }
  private async access(actor: SetupActor, id: string, c: PoolClient) {
    if (!actor.is_admin && !(await this.repo.isManager(id, actor.id, c)))
      fail(403, "ไม่มีสิทธิ์ตั้งค่าโปรเจกต์นี้");
    const p = await this.repo.project(id, c);
    if (!p) fail(404, "ไม่พบโปรเจกต์");
    return p;
  }
  private async detailFor(
    actor: SetupActor,
    p: SetupProject,
    c: PoolClient,
  ): Promise<SetupDetail> {
    const clients = await this.repo.references("clients", c),
      warehouses = await this.repo.references("warehouses", c);
    return {
      project: p,
      canAdmin: actor.is_admin,
      members: await this.repo.members(p.id, c),
      history: await this.repo.history(p.id, c),
      catalog: {
        clients: actor.is_admin
          ? clients
          : clients.filter((v) => v.id === p.clientId),
        warehouses: actor.is_admin
          ? warehouses
          : warehouses.filter((v) => p.warehouseIds.includes(v.id)),
        users: actor.is_admin ? await this.repo.users(c) : [],
      },
    };
  }
  async detail(actorId: string, id: string) {
    return this.db.transaction(async (c) => {
      const actor = await this.actor(actorId, c);
      return this.detailFor(actor, await this.access(actor, id, c), c);
    });
  }
  async list(actorId: string) {
    return this.db.transaction(async (c) => {
      await this.actor(actorId, c, true);
      return this.repo.list(c);
    });
  }
  async create(actorId: string, input: CreateProjectInput) {
    try {
      return await this.db.transaction(async (c) => {
        const actor = await this.actor(actorId, c, true);
        if (
          !(await this.repo.references("clients", c)).some(
            (v) => v.id === input.clientId,
          )
        )
          fail(400, "เลือก Client ที่มีอยู่ในระบบ");
        const id = randomUUID();
        await this.repo.create(id, input, actorId, c);
        const p = (await this.repo.project(id, c))!;
        await this.repo.audit(id, actor, "created", null, p, c, false);
        return this.detailFor(actor, p, c);
      });
    } catch (error) {
      if (databaseErrorCode(error) === "23505")
        fail(409, "รหัสโปรเจกต์นี้มีอยู่แล้ว");
      throw error;
    }
  }
  private async change(
    actorId: string,
    id: string,
    version: number,
    section: string,
    admin: boolean,
    work: (
      p: SetupProject,
      a: SetupActor,
      c: PoolClient,
    ) => Promise<{ before: unknown; after: unknown }>,
  ) {
    return this.db.transaction(async (c) => {
      const actor = await this.actor(actorId, c, admin),
        p = await this.access(actor, id, c);
      if (p.version !== version)
        fail(409, "มีผู้อื่นแก้ไขข้อมูลแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก");
      const values = await work(p, actor, c);
      await this.repo.audit(id, actor, section, values.before, values.after, c);
      return this.detailFor(actor, (await this.repo.project(id, c))!, c);
    });
  }
  general(actorId: string, id: string, input: GeneralInput) {
    return this.change(
      actorId,
      id,
      input.version,
      "general",
      false,
      async (p, a, c) => {
        if (!a.is_admin && input.clientId !== undefined)
          fail(403, "เฉพาะ Admin ที่แก้ Client ได้");
        const clientId = input.clientId ?? p.clientId;
        if (p.firstTransactionAt && clientId !== p.clientId)
          fail(409, "Client ถูกล็อกหลังเริ่มมีธุรกรรม");
        if (
          !(await this.repo.references("clients", c)).some(
            (v) => v.id === clientId,
          )
        )
          fail(400, "Client ไม่ถูกต้อง");
        const before = {
          name: p.name,
          description: p.description,
          accent: p.accent,
          clientId: p.clientId,
        };
        const after = {
          name: input.name,
          description: input.description,
          accent: input.accent,
          clientId,
        };
        await this.repo.general(id, input, clientId, c);
        return { before, after };
      },
    );
  }
  warehouses(actorId: string, id: string, input: WarehousesInput) {
    return this.change(
      actorId,
      id,
      input.version,
      "warehouses",
      false,
      async (p, a, c) => {
        if (!a.is_admin && input.warehouseIds !== undefined)
          fail(403, "เฉพาะ Admin ที่เปลี่ยนคลังที่อนุญาตได้");
        const ids = input.warehouseIds ?? p.warehouseIds;
        const defaultId = input.defaultWarehouseId;
        if (
          ids.length
            ? defaultId === null || !ids.includes(defaultId)
            : defaultId !== null
        )
          fail(400, "เลือกคลังเริ่มต้นจากคลังที่อนุญาตหนึ่งแห่ง");
        if (p.status === "active" && !ids.length)
          fail(400, "โปรเจกต์ที่เปิดใช้งานต้องมีคลัง");
        const available = await this.repo.references("warehouses", c);
        if (ids.some((id) => !available.some((w) => w.id === id)))
          fail(400, "คลังไม่ถูกต้อง");
        const usage = await this.repo.warehouseUsage(id, c);
        if (
          usage.some(
            (w) => !ids.includes(w.id) && (w.hasStock || w.hasOpenWork),
          )
        )
          fail(409, "นำคลังที่มีสต็อกหรืองานค้างออกไม่ได้");
        await this.repo.warehouses(id, ids, defaultId, c);
        return {
          before: {
            warehouseIds: p.warehouseIds,
            defaultWarehouseId: p.defaultWarehouseId,
          },
          after: { warehouseIds: ids, defaultWarehouseId: defaultId },
        };
      },
    );
  }
  rules(actorId: string, id: string, input: RulesInput) {
    return this.change(
      actorId,
      id,
      input.version,
      "rules",
      true,
      async (p, _a, c) => {
        if (p.firstTransactionAt) fail(409, "กฎถูกล็อกหลังเริ่มมีธุรกรรม");
        const after = {
          lot: input.lot,
          expiry: input.expiry,
          inspection: input.inspection,
        };
        await this.repo.rules(id, after, c);
        return { before: p.rules, after };
      },
    );
  }
  members(actorId: string, id: string, input: MembersInput) {
    return this.change(
      actorId,
      id,
      input.version,
      "members",
      true,
      async (_p, _a, c) => {
        const users = await this.repo.users(c);
        if (input.members.some((m) => !users.some((u) => u.id === m.userId)))
          fail(400, "ไม่พบผู้ใช้ที่เลือก");
        const before = await this.repo.members(id, c);
        await this.repo.setMembers(id, input.members, c);
        return { before, after: await this.repo.members(id, c) };
      },
    );
  }
  status(actorId: string, id: string, input: StatusInput) {
    return this.change(
      actorId,
      id,
      input.version,
      "status",
      true,
      async (p, _a, c) => {
        if (input.status === p.status) fail(400, "สถานะไม่เปลี่ยนแปลง");
        if (input.status === "active") {
          if (!p.warehouseIds.length || !p.defaultWarehouseId)
            fail(400, "กำหนดคลังและคลังเริ่มต้นก่อนเปิดใช้งาน");
          if (
            !(await this.repo.members(id, c)).some(
              (m) => m.active && m.roleId === "manager",
            )
          )
            fail(400, "ต้องมี Manager ที่เปิดใช้งานอย่างน้อยหนึ่งคน");
        } else if (
          (await this.repo.warehouseUsage(id, c)).some(
            (w) => w.hasStock || w.hasOpenWork,
          )
        )
          fail(409, "ปิดโปรเจกต์ที่มีสต็อกหรืองานค้างไม่ได้");
        await this.repo.status(id, input.status, c);
        return {
          before: { status: p.status },
          after: { status: input.status },
        };
      },
    );
  }
}
