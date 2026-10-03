import { Injectable, PipeTransform } from "@nestjs/common";
import { bodyObject } from "../../common/validation";
import { fail } from "../../common/errors";
import { roleIds, RoleId } from "../../common/models";
import { SetupRules, ProjectStatus } from "./setup.model";
const allowed = (body: Record<string, unknown>, keys: string[]) => {
  if (Object.keys(body).some((key) => !keys.includes(key)))
    fail(400, "มีฟิลด์ที่ไม่อนุญาตให้แก้ไข");
};
const text = (
  v: unknown,
  label: string,
  max = 100,
  optional = false,
): string => {
  if (typeof v !== "string" || (!optional && !v.trim()) || v.length > max)
    fail(400, `ระบุ${label}ให้ถูกต้อง (ไม่เกิน ${max} ตัวอักษร)`);
  return v.trim();
};
const version = (v: unknown): number => {
  if (!Number.isSafeInteger(v) || Number(v) < 1)
    fail(400, "เวอร์ชันไม่ถูกต้อง");
  return Number(v);
};
const accent = (v: unknown): "blue" | "violet" | "teal" => {
  if (v !== "blue" && v !== "violet" && v !== "teal") fail(400, "สีไม่ถูกต้อง");
  return v;
};
export interface ReferenceInput {
  code: string;
  name: string;
}
@Injectable()
export class ReferencePipe implements PipeTransform<unknown, ReferenceInput> {
  transform(value: unknown): ReferenceInput {
    const b = bodyObject(value);
    allowed(b, ["code", "name"]);
    const code = text(b.code, "รหัส", 30).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]{1,29}$/.test(code))
      fail(400, "รหัสใช้ภาษาอังกฤษ ตัวเลข _ หรือ - จำนวน 2–30 ตัว");
    return { code, name: text(b.name, "ชื่อ") };
  }
}
export interface CreateProjectInput extends ReferenceInput {
  clientId: string;
  description: string;
  accent: "blue" | "violet" | "teal";
}
@Injectable()
export class CreateProjectPipe implements PipeTransform<
  unknown,
  CreateProjectInput
> {
  transform(value: unknown): CreateProjectInput {
    const b = bodyObject(value);
    allowed(b, ["code", "name", "clientId", "description", "accent"]);
    return {
      ...new ReferencePipe().transform({ code: b.code, name: b.name }),
      clientId: text(b.clientId, "Client", 100),
      description: text(b.description ?? "", "คำอธิบาย", 500, true),
      accent: accent(b.accent),
    };
  }
}
export interface GeneralInput {
  version: number;
  name: string;
  description: string;
  accent: "blue" | "violet" | "teal";
  clientId?: string;
}
@Injectable()
export class GeneralPipe implements PipeTransform<unknown, GeneralInput> {
  transform(value: unknown): GeneralInput {
    const b = bodyObject(value);
    allowed(b, ["version", "name", "description", "accent", "clientId"]);
    return {
      version: version(b.version),
      name: text(b.name, "ชื่อ"),
      description: text(b.description, "คำอธิบาย", 500, true),
      accent: accent(b.accent),
      ...(b.clientId !== undefined
        ? { clientId: text(b.clientId, "Client") }
        : {}),
    };
  }
}
export interface WarehousesInput {
  version: number;
  warehouseIds?: string[];
  defaultWarehouseId: string | null;
}
@Injectable()
export class WarehousesPipe implements PipeTransform<unknown, WarehousesInput> {
  transform(value: unknown): WarehousesInput {
    const b = bodyObject(value);
    allowed(b, ["version", "warehouseIds", "defaultWarehouseId"]);
    let ids: string[] | undefined;
    if (b.warehouseIds !== undefined) {
      if (!Array.isArray(b.warehouseIds) || b.warehouseIds.length > 100)
        fail(400, "รายการคลังไม่ถูกต้อง");
      ids = b.warehouseIds.map((v) => text(v, "คลัง"));
      if (new Set(ids).size !== ids.length) fail(400, "คลังซ้ำ");
    }
    return {
      version: version(b.version),
      ...(ids ? { warehouseIds: ids } : {}),
      defaultWarehouseId:
        b.defaultWarehouseId === null
          ? null
          : text(b.defaultWarehouseId, "คลังเริ่มต้น"),
    };
  }
}
export interface RulesInput extends SetupRules {
  version: number;
}
@Injectable()
export class RulesPipe implements PipeTransform<unknown, RulesInput> {
  transform(value: unknown): RulesInput {
    const b = bodyObject(value);
    allowed(b, ["version", "lot", "expiry", "inspection"]);
    const mode = (v: unknown) => {
      if (v !== "off" && v !== "item" && v !== "required")
        fail(400, "กฎสินค้าไม่ถูกต้อง");
      return v;
    };
    if (typeof b.inspection !== "boolean") fail(400, "การตรวจสินค้าไม่ถูกต้อง");
    return {
      version: version(b.version),
      lot: mode(b.lot),
      expiry: mode(b.expiry),
      inspection: b.inspection,
    };
  }
}
export interface MembersInput {
  version: number;
  members: { userId: string; roleId: RoleId }[];
}
@Injectable()
export class MembersPipe implements PipeTransform<unknown, MembersInput> {
  transform(value: unknown): MembersInput {
    const b = bodyObject(value);
    allowed(b, ["version", "members"]);
    if (!Array.isArray(b.members) || b.members.length > 1000)
      fail(400, "สมาชิกไม่ถูกต้อง");
    const members = b.members.map((v) => {
      const m = bodyObject(v);
      allowed(m, ["userId", "roleId"]);
      if (typeof m.roleId !== "string" || !roleIds.has(m.roleId))
        fail(400, "บทบาทไม่ถูกต้อง");
      return { userId: text(m.userId, "ผู้ใช้"), roleId: m.roleId as RoleId };
    });
    if (new Set(members.map((m) => m.userId)).size !== members.length)
      fail(400, "ผู้ใช้ซ้ำ");
    return { version: version(b.version), members };
  }
}
export interface StatusInput {
  version: number;
  status: ProjectStatus;
}
@Injectable()
export class StatusPipe implements PipeTransform<unknown, StatusInput> {
  transform(value: unknown): StatusInput {
    const b = bodyObject(value);
    allowed(b, ["version", "status"]);
    if (b.status !== "active" && b.status !== "inactive")
      fail(400, "สถานะไม่ถูกต้อง");
    return { version: version(b.version), status: b.status };
  }
}
