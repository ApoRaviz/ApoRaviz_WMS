import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { roleLabels } from './setup.model';
import type { SetupDetail, SetupDraft } from './setup.model';
import type { RoleId } from '../admin/roles/role.model';
@Component({
  selector: 'wms-setup-members',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './member-fields.html',
})
export class MemberFields {
  readonly detail = input.required<SetupDetail>();
  readonly draft = input.required<SetupDraft>();
  readonly changed = output<void>();
  readonly roles: RoleId[] = ['manager', 'supervisor', 'operator', 'customer'];
  readonly labels = roleLabels;
  selectedUser = '';
  selectedRole: RoleId = 'operator';
  availableUsers() {
    return this.detail().catalog.users.filter(
      (u) => u.active && !this.draft().members.some((m) => m.userId === u.id),
    );
  }
  name(id: string) {
    const u =
      this.detail().catalog.users.find((u) => u.id === id) ??
      this.detail().members.find((u) => u.userId === id);
    return u ? `${u.name} (${u.username})${u.active ? '' : ' · ปิดใช้งาน'}` : id;
  }
  add() {
    if (!this.selectedUser || !this.availableUsers().some((u) => u.id === this.selectedUser))
      return;
    this.draft().members = [
      ...this.draft().members,
      { userId: this.selectedUser, roleId: this.selectedRole },
    ];
    this.selectedUser = '';
    this.changed.emit();
  }
  remove(id: string) {
    this.draft().members = this.draft().members.filter((m) => m.userId !== id);
    this.changed.emit();
  }
}
