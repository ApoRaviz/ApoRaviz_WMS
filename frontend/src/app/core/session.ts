import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type RoleId = 'manager' | 'supervisor' | 'operator' | 'customer';
export interface Membership {
  projectId: string;
  roleId: RoleId;
}
export interface User {
  id: string;
  username: string;
  name: string;
  isAdmin: boolean;
  active: boolean;
  mustChangePassword: boolean;
}
export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  description: string;
  accent: 'blue' | 'violet' | 'teal';
  roleId: RoleId | 'administrator';
  roleName: string;
  permissions: string[];
}
export interface Session {
  user: User;
  projects: Project[];
}
export interface ManagedUser extends User {
  memberships: Membership[];
}
export interface Role {
  id: RoleId;
  name: string;
  permissions: string[];
}
export interface AdminProject {
  id: string;
  code: string;
  name: string;
  client: string;
  description: string;
  accent: Project['accent'];
}
export interface Permission {
  id: string;
  name: string;
}
export interface UserInput {
  username: string;
  name: string;
  password: string;
  isAdmin: boolean;
  memberships: Membership[];
}
export interface UserUpdate {
  name: string;
  active: boolean;
  isAdmin: boolean;
  memberships: Membership[];
}

const mutationHeaders = new HttpHeaders({ 'X-WMS-Request': '1' });
const selectedProjectKey = 'wms.projectId';
const errorTranslations: Record<string, string> = {
  'Invalid membership': 'ข้อมูลสมาชิกโปรเจกต์ไม่ถูกต้อง',
  'Duplicate project membership': 'มีโปรเจกต์ซ้ำในรายการสมาชิก',
  'Password change required': 'กรุณาเปลี่ยนรหัสผ่านก่อนดำเนินการต่อ',
  'Administrator access required': 'เฉพาะผู้ดูแลระบบเท่านั้นที่เข้าใช้งานส่วนนี้ได้',
  'User not found': 'ไม่พบบัญชีผู้ใช้งาน',
  'Too many login attempts': 'เข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่',
  'New password must be 12 to 128 characters': 'รหัสผ่านใหม่ต้องมี 12–128 ตัวอักษร',
  'Current password is incorrect': 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
  'New password must be different': 'รหัสผ่านใหม่ต้องต่างจากรหัสผ่านปัจจุบัน',
  'Project access denied': 'คุณไม่มีสิทธิ์เข้าถึงโปรเจกต์นี้',
  'Invalid username': 'รูปแบบชื่อผู้ใช้ไม่ถูกต้อง',
  'Invalid name': 'ชื่อที่แสดงไม่ถูกต้อง',
  'Password must be 12 to 128 characters': 'รหัสผ่านต้องมี 12–128 ตัวอักษร',
  'Username already exists': 'ชื่อผู้ใช้นี้มีอยู่แล้ว',
  'Invalid user': 'ข้อมูลผู้ใช้งานไม่ถูกต้อง',
  'You cannot disable or demote yourself': 'ไม่สามารถปิดใช้งานหรือลดสิทธิ์บัญชีของตนเองได้',
  'At least one active administrator is required': 'ระบบต้องมีผู้ดูแลที่เปิดใช้งานอย่างน้อยหนึ่งคน',
  'Use your own password page': 'กรุณาใช้หน้าเปลี่ยนรหัสผ่านของบัญชีตนเอง',
  'Unknown role': 'ไม่พบบทบาทที่เลือก',
  'Unknown permission': 'ไม่พบสิทธิ์ที่เลือก',
  'memberships must be an array': 'รูปแบบรายการสมาชิกโปรเจกต์ไม่ถูกต้อง',
};

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
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
      this.restoreRequest = firstValueFrom(this.http.get<Session>('/api/auth/me'))
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
      const session = await firstValueFrom(
        this.http.post<Session>(
          '/api/auth/login',
          { username, password },
          { headers: mutationHeaders },
        ),
      );
      this.applySession(session);
      return session;
    });
  }

  async logout(): Promise<void> {
    await this.runPending(async () => {
      await firstValueFrom(
        this.http.post<{ ok: true }>('/api/auth/logout', {}, { headers: mutationHeaders }),
      );
      this.restoreRequest = undefined;
      this.clear();
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<Session> {
    return this.runPending(async () => {
      const session = await firstValueFrom(
        this.http.post<Session>(
          '/api/auth/password',
          { currentPassword, newPassword },
          { headers: mutationHeaders },
        ),
      );
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
    const response = await firstValueFrom(
      this.http.get<{ project: Project }>(`/api/projects/${encodeURIComponent(id)}/workspace`),
    );
    this.selectedProject.set(response.project);
    sessionStorage.setItem(selectedProjectKey, response.project.id);
    return response.project;
  }

  listUsers(): Promise<ManagedUser[]> {
    return firstValueFrom(this.http.get<ManagedUser[]>('/api/admin/users'));
  }
  createUser(input: UserInput): Promise<ManagedUser> {
    return firstValueFrom(
      this.http.post<ManagedUser>('/api/admin/users', input, { headers: mutationHeaders }),
    );
  }
  updateUser(id: string, input: UserUpdate): Promise<ManagedUser> {
    return firstValueFrom(
      this.http.patch<ManagedUser>(`/api/admin/users/${encodeURIComponent(id)}`, input, {
        headers: mutationHeaders,
      }),
    );
  }
  resetPassword(id: string, password: string): Promise<{ ok: true }> {
    return firstValueFrom(
      this.http.post<{ ok: true }>(
        `/api/admin/users/${encodeURIComponent(id)}/reset-password`,
        { password },
        { headers: mutationHeaders },
      ),
    );
  }
  listAdminProjects(): Promise<AdminProject[]> {
    return firstValueFrom(this.http.get<AdminProject[]>('/api/admin/projects'));
  }
  listRoles(): Promise<{ roles: Role[]; permissions: Permission[] }> {
    return firstValueFrom(
      this.http.get<{ roles: Role[]; permissions: Permission[] }>('/api/admin/roles'),
    );
  }
  updateRole(id: RoleId, permissions: string[]): Promise<Role> {
    return firstValueFrom(
      this.http.put<Role>(`/api/admin/roles/${id}`, { permissions }, { headers: mutationHeaders }),
    );
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

export function apiErrorMessage(error: unknown, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่'): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  const message = error.error?.message;
  if (Array.isArray(message)) return message.map(translateError).join(' ');
  return typeof message === 'string' && message.trim() ? translateError(message) : fallback;
}

function translateError(message: string): string {
  return errorTranslations[message] ?? message;
}
