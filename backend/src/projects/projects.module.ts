import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsDataModule } from "./projects-data.module";
import { ProjectsController } from "./projects.controller";
import { SetupController } from "./setup/setup.controller";
import { SetupService } from "./setup/setup.service";
import { ReferenceService } from "./setup/reference.service";
import { ReferenceRepository } from "./setup/reference.repository";
@Module({
  imports: [AuthModule, ProjectsDataModule],
  controllers: [ProjectsController, SetupController],
  providers: [SetupService, ReferenceService, ReferenceRepository],
})
export class ProjectsModule {}
