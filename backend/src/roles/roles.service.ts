import { Inject, Injectable } from "@nestjs/common";
import { Database } from "../db";
import { Role, RoleId, Permission, roleIds } from "../common/models";
import { fail } from "../common/errors";
import { RolesRepository } from "./roles.repository";
import { UpdateRoleDto } from "./roles.dto";
@Injectable()
export class RolesService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(RolesRepository) private readonly roles: RolesRepository,
  ) {}
  async list(): Promise<{ roles: Role[]; permissions: Permission[] }> {
    return {
      roles: await this.roles.list(),
      permissions: await this.roles.permissions(),
    };
  }
  assertKnownRole(id: string): asserts id is RoleId {
    if (!roleIds.has(id)) fail(400, "Unknown role");
  }
  async update(id: string, input: UpdateRoleDto): Promise<Role> {
    this.assertKnownRole(id);
    await this.db.transaction((client) =>
      this.roles.replace(id, input.permissions, client),
    );
    return {
      id,
      name: await this.roles.name(id),
      permissions: input.permissions,
    };
  }
}
