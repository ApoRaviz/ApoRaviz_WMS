import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { ReferenceInput } from "./setup.dto";
import { ReferenceItem } from "./setup.model";
@Injectable()
export class ReferenceRepository {
  async create(
    kind: "clients" | "warehouses",
    id: string,
    input: ReferenceInput,
    c: PoolClient,
  ): Promise<ReferenceItem> {
    return (
      await c.query<ReferenceItem>(
        `INSERT INTO ${kind}(id,code,name) VALUES($1,$2,$3) RETURNING id,code,name`,
        [id, input.code, input.name],
      )
    ).rows[0];
  }
}
