import { Inject, Injectable } from "@nestjs/common";
import { Project, AccessibleProject } from "../common/models";
import { fail } from "../common/errors";
import { ProjectsRepository } from "./projects.repository";
type ProjectActor = { id: string; is_admin: boolean };
@Injectable()
export class ProjectsService {
  constructor(
    @Inject(ProjectsRepository) private readonly projects: ProjectsRepository,
  ) {}
  list(): Promise<Project[]> {
    return this.projects.list();
  }
  async accessible(user: ProjectActor): Promise<AccessibleProject[]> {
    return user.is_admin
      ? (await this.projects.list()).map((p) => this.forAdmin(p))
      : this.projects.assigned(user.id);
  }
  async workspace(
    user: ProjectActor,
    id: string,
  ): Promise<{ project: AccessibleProject }> {
    const project = user.is_admin
      ? await this.projects.find(id).then((p) => p && this.forAdmin(p))
      : (await this.projects.assigned(user.id)).find(
          (p) => p.id === id && p.permissions.includes("workspace.view"),
        );
    if (!project) fail(403, "Project access denied");
    return { project };
  }
  private forAdmin(project: Project): AccessibleProject {
    return {
      ...project,
      roleId: "administrator",
      roleName: "Administrator",
      permissions: ["workspace.view"],
    };
  }
}
