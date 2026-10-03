import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { AdminProject, Project, WorkspaceResponse } from './project.model';
@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  listAdminProjects(): Promise<AdminProject[]> {
    return firstValueFrom(this.http.get<AdminProject[]>('/api/admin/projects'));
  }
  async openWorkspace(id: string): Promise<Project> {
    const response = await firstValueFrom(
      this.http.get<WorkspaceResponse>(`/api/projects/${encodeURIComponent(id)}/workspace`),
    );
    return response.project;
  }
}
