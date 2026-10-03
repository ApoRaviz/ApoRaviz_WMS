import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { ReferenceInput } from "./setup.dto";
import { ReferenceItem } from "./setup.model";
@Injectable()
export class ReferenceRepository {
  async create(
    kind: "clients" | "warehouses",
    input: ReferenceInput,
    c: PoolClient,
  ): Promise<ReferenceItem> {
    return (
      await c.query<ReferenceItem>(
        `INSERT INTO ${kind}(code,name) VALUES($1,$2) RETURNING public_id id,code,name`,
        [input.code, input.name],
      )
    ).rows[0];
  }
}
