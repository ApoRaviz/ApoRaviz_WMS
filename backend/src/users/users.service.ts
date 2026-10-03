import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Database } from "../db";
import { ManagedUser } from "../common/models";
import { databaseErrorCode, fail } from "../common/errors";
import { hashPassword } from "../security";
import { SessionsRepository } from "../auth/sessions.repository";
import { UsersRepository } from "./users.repository";
import { publicUser } from "./user.entity";
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from "./users.dto";
import { MembershipAuditService } from "../projects/setup/membership-audit.service";
@Injectable()
export class UsersService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(UsersRepository) private readonly users: UsersRepository,
    @Inject(SessionsRepository) private readonly sessions: SessionsRepository,
    @Inject(MembershipAuditService)
    private readonly membershipAudit: MembershipAuditService,
  ) {}
  async managed(id: string): Promise<ManagedUser> {
    const user = await this.users.find(id);
    if (!user) fail(404, "User not found");
    return {
      ...publicUser(user),
      memberships: await this.users.memberships(id),
    };
  }
  async list(): Promise<ManagedUser[]> {
    return Promise.all(
      (await this.users.listIds()).map((id) => this.managed(id)),
    );
  }
  async create(input: CreateUserDto, actorId: string): Promise<ManagedUser> {
    const id = randomUUID();
    try {
      await this.db.transaction(async (client) => {
        await this.users.lockAdministrators(client);
        const actor = await this.users.lock(actorId, client);
        if (!actor?.active || !actor.is_admin || actor.must_change_password)
          fail(403, "Administrator access required");
        const before = await this.membershipAudit.capture(
          input.memberships.map((m) => m.projectId),
          client,
        );
        await this.users.create(
          id,
          input.username,
          input.name,
          await hashPassword(input.password),
          input.isAdmin,
          client,
        );
        await this.users.addMemberships(id, input.memberships, client);
        await this.membershipAudit.record(actor, before, client);
      });
    } catch (error: unknown) {
      if (databaseErrorCode(error) === "23505")
        fail(409, "Username already exists");
      if (databaseErrorCode(error) === "23503") fail(400, "Invalid membership");
      throw error;
    }
    return this.managed(id);
  }
  async update(
    actorId: string,
    id: string,
    input: UpdateUserDto,
  ): Promise<ManagedUser> {
    if (actorId === id && (!input.active || !input.isAdmin))
      fail(400, "You cannot disable or demote yourself");
    try {
      await this.db.transaction(async (client) => {
        await this.users.lockAdministrators(client);
        const actor = await this.users.lock(actorId, client);
        if (!actor?.active || !actor.is_admin)
          fail(403, "Administrator access required");
        const target = await this.users.lock(id, client);
        if (!target) fail(404, "User not found");
        const previousMemberships = await this.users.memberships(id, client);
        const expected = input.expectedMemberships;
        if (
          previousMemberships.length !== expected.length ||
          previousMemberships.some(
            (membership) =>
              !expected.some(
                (entry) =>
                  entry.projectId === membership.projectId &&
                  entry.roleId === membership.roleId,
              ),
          )
        )
          fail(
            409,
            "สมาชิกโปรเจกต์ถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก",
          );
        const before = await this.membershipAudit.capture(
          [...previousMemberships, ...input.memberships].map(
            (m) => m.projectId,
          ),
          client,
        );
        if (
          target.is_admin &&
          target.active &&
          (!input.isAdmin || !input.active)
        ) {
          if ((await this.users.countLockedActiveAdministrators(client)) <= 1)
            fail(400, "At least one active administrator is required");
        }
        await this.users.update(id, input, client);
        await this.users.replaceMemberships(id, input.memberships, client);
        await this.membershipAudit.record(actor, before, client);
        await this.sessions.revokeUser(id, client);
      });
    } catch (error: unknown) {
      if (databaseErrorCode(error) === "23503") fail(400, "Invalid membership");
      throw error;
    }
    return this.managed(id);
  }
  assertResetTarget(actorId: string, id: string): void {
    if (actorId === id) fail(400, "Use your own password page");
  }
  async reset(
    actorId: string,
    id: string,
    input: ResetPasswordDto,
  ): Promise<{ ok: true }> {
    this.assertResetTarget(actorId, id);
    await this.db.transaction(async (client) => {
      if (!(await this.users.lock(id, client))) fail(404, "User not found");
      await this.users.setPassword(
        id,
        await hashPassword(input.password),
        true,
        client,
      );
      await this.sessions.revokeUser(id, client);
    });
    return { ok: true };
  }
}
