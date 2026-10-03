import { Module } from "@nestjs/common";
import { ProjectsRepository } from "./projects.repository";
import { ProjectsService } from "./projects.service";
import { SetupRepository } from "./setup/setup.repository";
import { MembershipAuditService } from "./setup/membership-audit.service";
@Module({
  providers: [
    ProjectsRepository,
    ProjectsService,
    SetupRepository,
    MembershipAuditService,
  ],
  exports: [ProjectsService, SetupRepository, MembershipAuditService],
})
export class ProjectsDataModule {}
