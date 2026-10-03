import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Database } from "../../db";
import { fail, databaseErrorCode } from "../../common/errors";
import { SetupRepository } from "./setup.repository";
import { ReferenceRepository } from "./reference.repository";
import { ReferenceInput } from "./setup.dto";
@Injectable()
export class ReferenceService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(SetupRepository) private readonly setup: SetupRepository,
    @Inject(ReferenceRepository) private readonly repo: ReferenceRepository,
  ) {}
  async catalog(actorId: string) {
    return this.db.transaction(async (c) => {
      await this.setup.serialize(c);
      const actor = await this.setup.actor(actorId, c);
      if (!actor?.active || !actor.is_admin || actor.must_change_password)
        fail(403, "Administrator access required");
      return {
        clients: await this.setup.references("clients", c),
        warehouses: await this.setup.references("warehouses", c),
      };
    });
  }
  async create(
    actorId: string,
    kind: "clients" | "warehouses",
    input: ReferenceInput,
  ) {
    try {
      return await this.db.transaction(async (c) => {
        await this.setup.serialize(c);
        const actor = await this.setup.actor(actorId, c);
        if (!actor?.active || !actor.is_admin || actor.must_change_password)
          fail(403, "Administrator access required");
        return this.repo.create(kind, randomUUID(), input, c);
      });
    } catch (error) {
      if (databaseErrorCode(error) === "23505") fail(409, "รหัสนี้มีอยู่แล้ว");
      throw error;
    }
  }
}
