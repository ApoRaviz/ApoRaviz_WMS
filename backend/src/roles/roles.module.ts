import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { RolesRepository } from "./roles.repository";
import { KnownRoleGuard } from "./known-role.guard";
@Module({
  imports: [AuthModule],
  controllers: [RolesController],
  providers: [RolesService, RolesRepository, KnownRoleGuard],
})
export class RolesModule {}
