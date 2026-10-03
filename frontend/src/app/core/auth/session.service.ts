import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session } from './session.model';
import type { Project } from '../../features/projects/project.model';
import { AuthApiService } from './auth-api.service';
import { ProjectsService } from '../../features/projects/projects.service';
const selectedProjectKey = 'wms.projectId';
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AuthApiService);
  private readonly projectsApi = inject(ProjectsService);
  private readonly currentSession = signal<Session | null>(null);
  private readonly selectedProject = signal<Project | null>(null);
  private restoreRequest?: Promise<Session | null>;
  readonly session = this.currentSession.asReadonly();
  readonly user = computed(() => this.currentSession()?.user ?? null);
  readonly projects = computed(() => this.currentSession()?.projects ?? []);
  readonly selected = this.selectedProject.asReadonly();
  readonly pending = signal(false);
  readonly restoreError = signal('');

  restore(): Promise<Session | null> {
    if (!this.restoreRequest) {
      this.restoreRequest = this.auth
        .restore()
        .then((session) => {
          this.restoreError.set('');
          this.applySession(session);
          return session;
        })
        .catch((error: unknown) => {
          this.clear();
          if (error instanceof HttpErrorResponse && error.status === 401) return null;
          this.restoreError.set('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่');
          return null;
        })
        .finally(() => {
          this.restoreRequest = undefined;
        });
    }
    return this.restoreRequest;
  }

  async login(username: string, password: string): Promise<Session> {
    return this.runPending(async () => {
      const session = await this.auth.login({ username, password });
      this.applySession(session);
      return session;
    });
  }

  async logout(): Promise<void> {
    await this.runPending(async () => {
      await this.auth.logout();
      this.restoreRequest = undefined;
      this.clear();
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<Session> {
    return this.runPending(async () => {
      const session = await this.auth.changePassword({ currentPassword, newPassword });
      this.applySession(session);
      return session;
    });
  }

  selectProject(id: string): boolean {
    const project = this.projects().find((item) => item.id === id);
    if (!project) return false;
    this.selectedProject.set(project);
    sessionStorage.setItem(selectedProjectKey, id);
    return true;
  }

  clearProject(): void {
    this.selectedProject.set(null);
    sessionStorage.removeItem(selectedProjectKey);
  }

  async openWorkspace(id: string): Promise<Project> {
    const project = await this.projectsApi.openWorkspace(id);
    this.selectedProject.set(project);
    sessionStorage.setItem(selectedProjectKey, project.id);
    return project;
  }

  private applySession(session: Session): void {
    this.currentSession.set(session);
    const preferred = sessionStorage.getItem(selectedProjectKey);
    const selected = preferred
      ? (session.projects.find((project) => project.id === preferred) ?? null)
      : null;
    this.selectedProject.set(selected);
    if (!selected) sessionStorage.removeItem(selectedProjectKey);
  }
  private clear(): void {
    this.currentSession.set(null);
    this.clearProject();
  }
  private async runPending<T>(action: () => Promise<T>): Promise<T> {
    this.pending.set(true);
    try {
      return await action();
    } finally {
      this.pending.set(false);
    }
  }
}
