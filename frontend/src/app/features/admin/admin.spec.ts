import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Admin } from './admin';
import { ManagedUser, SessionService } from '../../core/session';

const managedUser: ManagedUser = {
  id: 'u2', username: 'worker', name: 'พนักงาน', isAdmin: false, active: true,
  mustChangePassword: false,
  memberships: [
    { projectId: 'apo-id', roleId: 'manager' },
    { projectId: 'squ-id', roleId: 'operator' },
  ],
};

describe('Admin membership editor', () => {
  let fixture: ComponentFixture<Admin>;
  beforeEach(async () => {
    const user = signal({ id: 'admin', username: 'admin', name: 'ผู้ดูแล', isAdmin: true, active: true, mustChangePassword: false });
    const pending = signal(false);
    const service = {
      user, pending,
      listUsers: async () => [managedUser],
      listAdminProjects: async () => [
        { id: 'apo-id', code: 'APO', name: 'Apo', client: 'ลูกค้า', description: '', accent: 'blue' },
        { id: 'squ-id', code: 'SQU', name: 'Squ', client: 'ลูกค้า', description: '', accent: 'violet' },
      ],
      listRoles: async () => ({ roles: [
        { id: 'manager', name: 'ผู้จัดการ', permissions: ['workspace.view'] },
        { id: 'operator', name: 'ผู้ปฏิบัติงาน', permissions: ['workspace.view'] },
      ], permissions: [{ id: 'workspace.view', name: 'ดูพื้นที่ทำงาน' }] }),
    };
    TestBed.configureTestingModule({ providers: [
      { provide: SessionService, useValue: service },
      provideRouter([]),
    ] });
    fixture = TestBed.createComponent(Admin);
    await fixture.whenStable();
    fixture.componentInstance.editUser(managedUser);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('shows each existing membership role in its project select', () => {
    const apo = fixture.nativeElement.querySelector('[aria-label="บทบาทในโปรเจกต์ Apo"]') as HTMLSelectElement;
    const squ = fixture.nativeElement.querySelector('[aria-label="บทบาทในโปรเจกต์ Squ"]') as HTMLSelectElement;
    expect(apo.value).toBe('manager');
    expect(squ.value).toBe('operator');
  });

  it('describes company administrators as having global project access', () => {
    expect(fixture.componentInstance.membershipSummary({ ...managedUser, isAdmin: true, memberships: [] }))
      .toBe('ทุกโปรเจกต์ · ผู้ดูแลบริษัท');
  });
});
