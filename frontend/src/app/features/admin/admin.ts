import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminProject,
  apiErrorMessage,
  ManagedUser,
  Membership,
  Role,
  RoleId,
  SessionService,
} from '../../core/session';
import { Icon } from '../../shared/icon';
import { Topbar } from '../../shared/topbar';

type Tab = 'users' | 'roles';
interface UserDraft {
  id?: string;
  username: string;
  name: string;
  password: string;
  active: boolean;
  isAdmin: boolean;
  memberships: Membership[];
}
const emptyDraft = (): UserDraft => ({
  username: '',
  name: '',
  password: '',
  active: true,
  isAdmin: false,
  memberships: [],
});

@Component({
  selector: 'wms-admin',
  imports: [FormsModule, Topbar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="flex min-h-dvh flex-col bg-canvas">
    <wms-topbar />
    <main id="main-content" tabindex="-1" class="page-shell">
      <div class="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p class="eyebrow mb-2">ADMINISTRATION</p>
          <h1 class="text-3xl font-semibold sm:text-4xl">จัดการระบบ</h1>
          <p class="mt-2 text-muted">บัญชีผู้ใช้งาน สมาชิกโปรเจกต์ และสิทธิ์ของแต่ละบทบาท</p>
        </div>
        @if (tab() === 'users' && !editing()) {
          <button class="primary-button" type="button" (click)="startCreate()">
            <wms-icon name="plus" />เพิ่มผู้ใช้งาน
          </button>
        }
      </div>
      <div class="mt-8 flex gap-2 border-b border-line" role="tablist" aria-label="ส่วนจัดการระบบ">
        <button
          type="button"
          class="tab-button"
          role="tab"
          [attr.aria-selected]="tab() === 'users'"
          (click)="tab.set('users')"
        >
          ผู้ใช้งาน</button
        ><button
          type="button"
          class="tab-button"
          role="tab"
          [attr.aria-selected]="tab() === 'roles'"
          (click)="tab.set('roles')"
        >
          สิทธิ์ตามบทบาท
        </button>
      </div>
      @if (error()) {
        <div role="alert" class="alert-error mt-5">
          <wms-icon name="info" /><span>{{ error() }}</span>
        </div>
      }
      @if (success()) {
        <div role="status" class="alert-success mt-5">
          <wms-icon name="check" /><span>{{ success() }}</span>
        </div>
      }
      @if (loading()) {
        <p role="status" class="py-12 text-center text-muted">กำลังโหลดข้อมูล…</p>
      } @else if (tab() === 'users') {
        @if (editing()) {
          <section id="user-editor" tabindex="-1" class="surface-card mt-6 p-5 sm:p-8">
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-xl font-semibold">
                {{ draft().id ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน' }}
              </h2>
              <button
                class="icon-button"
                type="button"
                aria-label="ปิดแบบฟอร์ม"
                (click)="closeEditor()"
              >
                <wms-icon name="close" />
              </button>
            </div>
            <form class="mt-6 space-y-6" (ngSubmit)="saveUser()" #userForm="ngForm">
              <div class="grid gap-5 sm:grid-cols-2">
                <div>
                  <label for="admin-username" class="field-label">ชื่อผู้ใช้</label>
                  <div class="input-wrap">
                    <input
                      id="admin-username"
                      name="username"
                      [(ngModel)]="draft().username"
                      required
                      pattern="[A-Za-z0-9._-]{3,50}"
                      [readOnly]="!!draft().id"
                      autocomplete="off"
                    />
                  </div>
                </div>
                <div>
                  <label for="admin-name" class="field-label">ชื่อที่แสดง</label>
                  <div class="input-wrap">
                    <input
                      id="admin-name"
                      name="name"
                      [(ngModel)]="draft().name"
                      required
                      maxlength="100"
                      autocomplete="off"
                    />
                  </div>
                </div>
              </div>
              @if (!draft().id) {
                <div>
                  <label for="admin-password" class="field-label">รหัสผ่านชั่วคราว</label>
                  <div class="input-wrap">
                    <input
                      id="admin-password"
                      name="password"
                      type="password"
                      [(ngModel)]="draft().password"
                      required
                      minlength="12"
                      maxlength="128"
                      autocomplete="new-password"
                    />
                  </div>
                  <p class="mt-2 text-xs text-muted">
                    ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก
                  </p>
                </div>
              }
              <div class="flex flex-wrap gap-6">
                <label class="check-label"
                  ><input type="checkbox" name="isAdmin" [(ngModel)]="draft().isAdmin" />
                  ผู้ดูแลระบบบริษัท</label
                >
                @if (draft().id) {
                  <label class="check-label"
                    ><input type="checkbox" name="active" [(ngModel)]="draft().active" />
                    เปิดใช้งานบัญชี</label
                  >
                }
              </div>
              <fieldset>
                <legend class="font-semibold">สมาชิกโปรเจกต์</legend>
                <p class="mt-1 text-sm text-muted">
                  หนึ่งบทบาทต่อหนึ่งโปรเจกต์ เว้นว่างหากไม่ต้องการมอบหมาย
                </p>
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  @for (project of projects(); track project.id) {
                    <label class="membership-row"
                      ><span
                        ><strong>{{ project.name }}</strong
                        ><small>{{ project.code }}</small></span
                      ><select
                        [attr.aria-label]="'บทบาทในโปรเจกต์ ' + project.name"
                        [ngModel]="membershipRole(project.id)"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="setMembershipRole(project.id, $event)"
                      >
                        <option value="">ไม่ได้มอบหมาย</option>
                        @for (role of roles(); track role.id) {
                          <option [value]="role.id">{{ role.name }}</option>
                        }
                      </select></label
                    >
                  }
                </div>
              </fieldset>
              <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button class="secondary-button" type="button" (click)="closeEditor()">
                  ยกเลิก</button
                ><button
                  class="primary-button"
                  type="submit"
                  [disabled]="saving() || userForm.invalid"
                >
                  {{ saving() ? 'กำลังบันทึก…' : 'บันทึกผู้ใช้งาน' }}
                </button>
              </div>
            </form>
          </section>
        }
        @if (resetTarget()) {
          <section id="reset-editor" tabindex="-1" class="surface-card mt-6 p-5 sm:p-8">
            <h2 class="text-xl font-semibold">รีเซ็ตรหัสผ่าน: {{ resetTarget()?.name }}</h2>
            <p class="mt-2 text-sm text-muted">
              การบันทึกจะยกเลิกเซสชันทั้งหมดของผู้ใช้นี้
              และบังคับให้เปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งถัดไป
            </p>
            <form class="mt-5 space-y-5" (ngSubmit)="submitReset()">
              <div>
                <label for="reset-password" class="field-label">รหัสผ่านชั่วคราวใหม่</label>
                <div class="input-wrap">
                  <input
                    id="reset-password"
                    name="resetPassword"
                    type="password"
                    [(ngModel)]="resetDraft"
                    required
                    minlength="12"
                    maxlength="128"
                    autocomplete="new-password"
                  />
                </div>
              </div>
              <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button class="secondary-button" type="button" (click)="cancelReset()">
                  ยกเลิก</button
                ><button
                  class="primary-button"
                  type="submit"
                  [disabled]="saving() || resetDraft.length < 12 || resetDraft.length > 128"
                >
                  ยืนยันรีเซ็ตรหัสผ่าน
                </button>
              </div>
            </form>
          </section>
        }
        <div class="mt-6 grid gap-4">
          @for (user of users(); track user.id) {
            <article class="surface-card p-5">
              <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="font-semibold">{{ user.name }}</h2>
                    @if (user.isAdmin) {
                      <span class="role-badge">ผู้ดูแลระบบ</span>
                    }
                    <span class="status-badge" [class.inactive]="!user.active">{{
                      user.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'
                    }}</span>
                  </div>
                  <p class="mt-1 text-sm text-muted">
                    &#64;{{ user.username }} · {{ membershipSummary(user) }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="secondary-button text-sm" (click)="editUser(user)">
                    แก้ไข</button
                  ><button
                    type="button"
                    class="secondary-button text-sm"
                    [disabled]="user.id === session.user()?.id"
                    (click)="startReset(user)"
                  >
                    รีเซ็ตรหัสผ่าน
                  </button>
                </div>
              </div>
            </article>
          } @empty {
            <div class="empty-state">ยังไม่มีผู้ใช้งาน</div>
          }
        </div>
      } @else {
        <section class="mt-6">
          <div class="surface-card p-5 sm:p-8">
            <h2 class="text-xl font-semibold">สิทธิ์ตามบทบาท</h2>
            <p class="mt-2 leading-7 text-muted">
              การเป็นผู้ดูแลระบบบริษัทกำหนดแยกจากสิทธิ์โปรเจกต์ รายการด้านล่างใช้ร่วมกันทุกโปรเจกต์
            </p>
            <div class="mt-6 grid gap-4">
              @for (role of roles(); track role.id) {
                <div class="role-row">
                  <div>
                    <h3 class="font-semibold">{{ role.name }}</h3>
                    <p class="text-xs text-muted">{{ role.id }}</p>
                  </div>
                  <label class="check-label"
                    ><input
                      type="checkbox"
                      [checked]="hasPermission(role, 'workspace.view')"
                      (change)="togglePermission(role, 'workspace.view', $event)"
                    />
                    ดูพื้นที่ทำงาน (workspace.view)</label
                  ><button
                    class="secondary-button"
                    type="button"
                    [disabled]="savingRole() === role.id"
                    (click)="saveRole(role)"
                  >
                    {{ savingRole() === role.id ? 'กำลังบันทึก…' : 'บันทึกสิทธิ์' }}
                  </button>
                </div>
              }
            </div>
          </div>
        </section>
      }
    </main>
  </div>`,
})
export class Admin {
  readonly session = inject(SessionService);
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
  readonly success = signal('');
  constructor() {
    void this.load();
  }
  private async load(): Promise<void> {
    try {
      const [users, projects, catalog] = await Promise.all([
        this.session.listUsers(),
        this.session.listAdminProjects(),
        this.session.listRoles(),
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
    this.saving.set(true);
    const value = this.draft();
    try {
      const saved = value.id
        ? await this.session.updateUser(value.id, {
            name: value.name,
            active: value.active,
            isAdmin: value.isAdmin,
            memberships: value.memberships,
          })
        : await this.session.createUser({
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
      await this.session.resetPassword(user.id, this.resetDraft);
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
      const saved = await this.session.updateRole(role.id, role.permissions);
      this.roles.update((roles) => roles.map((item) => (item.id === saved.id ? saved : item)));
      this.success.set(`บันทึกสิทธิ์ ${saved.name} เรียบร้อยแล้ว`);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.savingRole.set(null);
    }
  }
  private clearMessages(): void {
    this.error.set('');
    this.success.set('');
  }
  private focusEditor(id: string): void {
    queueMicrotask(() => document.getElementById(id)?.focus());
  }
}
