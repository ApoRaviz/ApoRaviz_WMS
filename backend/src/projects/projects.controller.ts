import { Controller, Get, Inject, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/auth.http";
import { SessionGuard, AdminGuard } from "../auth/auth.guards";
import { UserRow } from "../users/user.entity";
import { ProjectsService } from "./projects.service";
@Controller()
@UseGuards(SessionGuard)
export class ProjectsController {
  constructor(
    @Inject(ProjectsService) private readonly projects: ProjectsService,
  ) {}
  @Get("projects/:id/workspace")
  workspace(@CurrentUser() user: UserRow, @Param("id") id: string) {
    return this.projects.workspace(user, id);
  }
  @Get("admin/projects")
  @UseGuards(AdminGuard)
  list() {
    return this.projects.list();
  }
}
