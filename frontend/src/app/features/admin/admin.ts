import { UsersService } from './users/users.service';
import { RolesService } from './roles/roles.service';
import { ProjectsService } from '../projects/projects.service';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import type { AdminProject } from '../projects/project.model';
import { apiErrorMessage } from '../../core/http/api-error';
import type { ManagedUser } from './users/user.model';
import type { Membership } from './users/user.model';
import type { Role } from './roles/role.model';
import type { RoleId } from './roles/role.model';
import { SessionService } from '../../core/auth/session.service';
import { Icon } from '../../shared/icon';
import { Topbar } from '../../core/layout/topbar';

type Tab = 'users' | 'roles';
interface UserDraft {
  id?: string;
  username: string;
  name: string;
  password: string;
  active: boolean;
  isAdmin: boolean;
  memberships: Membership[];
  expectedMemberships: Membership[];
}
const emptyDraft = (): UserDraft => ({
  username: '',
  name: '',
  password: '',
  active: true,
  isAdmin: false,
  memberships: [],
  expectedMemberships: [],
});

@Component({
  selector: 'wms-admin',
  imports: [FormsModule, Topbar, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.html',
})
export class Admin {
  readonly usernamePattern = '[A-Za-z0-9._\\-]{3,50}';
  readonly session = inject(SessionService);
  private readonly usersApi = inject(UsersService);
  private readonly rolesApi = inject(RolesService);
  private readonly projectsApi = inject(ProjectsService);
  readonly tab = signal<Tab>('users');
  readonly users = signal<ManagedUser[]>([]);
  readonly projects = signal<AdminProject[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingRole = signal<RoleId | null>(null);
  readonly editing = signal(false);
  readonly draft = signal<UserDraft>(emptyDraft());
  readonly resetTarget = signal<ManagedUser | null>(null);
  resetDraft = '';
  readonly error = signal('');
  readonly membershipConflict = signal(false);
  readonly success = signal('');
  constructor() {
    void this.load();
  }
  private async load(): Promise<void> {
    try {
      const [users, projects, catalog] = await Promise.all([
        this.usersApi.listUsers(),
        this.projectsApi.listAdminProjects(),
        this.rolesApi.listRoles(),
      ]);
      this.users.set(users);
      this.projects.set(projects);
      this.roles.set(catalog.roles);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
  startCreate(): void {
    this.cancelReset();
    this.draft.set(emptyDraft());
    this.editing.set(true);
    this.clearMessages();
    this.focusEditor('user-editor');
  }
  editUser(user: ManagedUser): void {
    this.cancelReset();
    this.draft.set({
      id: user.id,
      username: user.username,
      name: user.name,
      password: '',
      active: user.active,
      isAdmin: user.isAdmin,
      memberships: user.memberships.map((item) => ({ ...item })),
      expectedMemberships: user.memberships.map((item) => ({ ...item })),
    });
    this.editing.set(true);
    this.clearMessages();
    this.focusEditor('user-editor');
  }
  closeEditor(): void {
    this.draft.set(emptyDraft());
    this.editing.set(false);
  }
  membershipRole(projectId: string): string {
    return this.draft().memberships.find((item) => item.projectId === projectId)?.roleId ?? '';
  }
  setMembershipRole(projectId: string, roleId: RoleId | ''): void {
    const rest = this.draft().memberships.filter((item) => item.projectId !== projectId);
    this.draft.update((value) => ({
      ...value,
      memberships: roleId ? [...rest, { projectId, roleId }] : rest,
    }));
  }
  async saveUser(): Promise<void> {
    this.clearMessages();
    if (!/^[A-Za-z0-9._-]{3,50}$/.test(this.draft().username)) {
      this.error.set('Username ต้องเป็นภาษาอังกฤษ ตัวเลข หรือ . _ - จำนวน 3–50 ตัวอักษรเท่านั้น');
      return;
    }
    this.saving.set(true);
    const value = this.draft();
    try {
      const saved = value.id
        ? await this.usersApi.updateUser(value.id, {
            name: value.name,
            active: value.active,
            isAdmin: value.isAdmin,
            memberships: value.memberships,
            expectedMemberships: value.expectedMemberships,
          })
        : await this.usersApi.createUser({
            username: value.username,
            name: value.name,
            password: value.password,
            isAdmin: value.isAdmin,
            memberships: value.memberships,
          });
      this.users.update((users) =>
        value.id ? users.map((item) => (item.id === saved.id ? saved : item)) : [...users, saved],
      );
      this.draft.set(emptyDraft());
      this.editing.set(false);
      this.success.set('บันทึกผู้ใช้งานเรียบร้อยแล้ว');
    } catch (error) {
      this.error.set(apiErrorMessage(error));
      this.membershipConflict.set(
        !!value.id && error instanceof HttpErrorResponse && error.status === 409,
      );
    } finally {
      this.saving.set(false);
    }
  }
  async reloadEditedUser(): Promise<void> {
    const id = this.draft().id;
    if (!id || this.saving()) return;
    this.saving.set(true);
    try {
      const users = await this.usersApi.listUsers();
      const user = users.find((item) => item.id === id);
      if (!user) throw new Error('ไม่พบผู้ใช้');
      this.users.set(users);
      this.editUser(user);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }
  startReset(user: ManagedUser): void {
    this.closeEditor();
    this.resetDraft = '';
    this.resetTarget.set(user);
    this.clearMessages();
    this.focusEditor('reset-editor');
  }
  cancelReset(): void {
    this.resetDraft = '';
    this.resetTarget.set(null);
  }
  async submitReset(): Promise<void> {
    const user = this.resetTarget();
    if (!user || this.resetDraft.length < 12 || this.resetDraft.length > 128) return;
    this.clearMessages();
    this.saving.set(true);
    try {
      await this.usersApi.resetPassword(user.id, this.resetDraft);
      this.cancelReset();
      this.success.set('รีเซ็ตรหัสผ่านเรียบร้อยแล้ว');
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }
  membershipSummary(user: ManagedUser): string {
    if (user.isAdmin) return 'ทุกโปรเจกต์ · ผู้ดูแลบริษัท';
    if (!user.memberships.length) return 'ไม่มีโปรเจกต์';
    return user.memberships
      .map(
        (membership) =>
          `${this.projects().find((item) => item.id === membership.projectId)?.code ?? membership.projectId}: ${this.roles().find((role) => role.id === membership.roleId)?.name ?? membership.roleId}`,
      )
      .join(' · ');
  }
  hasPermission(role: Role, permission: string): boolean {
    return role.permissions.includes(permission);
  }
  togglePermission(role: Role, permission: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.roles.update((roles) =>
      roles.map((item) =>
        item.id === role.id
          ? {
              ...item,
              permissions: checked
                ? [...new Set([...item.permissions, permission])]
                : item.permissions.filter((value) => value !== permission),
            }
          : item,
      ),
    );
  }
  async saveRole(role: Role): Promise<void> {
    this.clearMessages();
    this.savingRole.set(role.id);
    try {
      const saved = await this.rolesApi.updateRole(role.id, role.permissions);
      this.roles.update((roles) => roles.map((item) => (item.id === saved.id ? saved : item)));
      this.success.set(`บันทึกสิทธิ์ ${saved.name} เรียบร้อยแล้ว`);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.savingRole.set(null);
    }
  }
  private clearMessages(): void {
    this.membershipConflict.set(false);
    this.error.set('');
    this.success.set('');
  }
  private focusEditor(id: string): void {
    queueMicrotask(() => document.getElementById(id)?.focus());
  }
}
