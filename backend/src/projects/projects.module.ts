import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsDataModule } from "./projects-data.module";
import { ProjectsController } from "./projects.controller";
@Module({
  imports: [AuthModule, ProjectsDataModule],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
