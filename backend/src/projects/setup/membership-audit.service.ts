import { Inject, Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { SetupRepository } from "./setup.repository";
import { SetupMember } from "./setup.model";
@Injectable()
export class MembershipAuditService {
  constructor(
    @Inject(SetupRepository) private readonly repo: SetupRepository,
  ) {}
  async capture(projectIds: string[], c: PoolClient) {
    const result = new Map<string, SetupMember[]>();
    for (const id of [...new Set(projectIds)].sort())
      result.set(id, await this.repo.members(id, c));
    return result;
  }
  async record(
    actor: { id: string; name: string },
    before: Map<string, SetupMember[]>,
    c: PoolClient,
  ) {
    for (const [id, previous] of before) {
      const after = await this.repo.members(id, c);
      if (JSON.stringify(previous) !== JSON.stringify(after))
        await this.repo.audit(id, actor, "members", previous, after, c);
    }
  }
}
