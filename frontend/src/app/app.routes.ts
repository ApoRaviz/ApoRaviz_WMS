import { Routes } from '@angular/router';
import { requireProjectSetup, confirmSetupLeave } from './features/project-setup/setup.guard';
import {
  requireAdmin,
  requireGuest,
  requirePasswordChanged,
  requireSession,
} from './core/auth/guards';

export const routes: Routes = [
  {
    path: 'admin/projects',
    title: 'จัดการโปรเจกต์ · Apo WMS',
    canActivate: [requireAdmin],
    loadComponent: () =>
      import('./features/project-setup/project-list').then((m) => m.ProjectAdminList),
  },
  {
    path: 'admin/project-reference-data',
    title: 'ข้อมูลกลาง · Apo WMS',
    canActivate: [requireAdmin],
    loadComponent: () =>
      import('./features/project-setup/reference-page').then((m) => m.ReferencePage),
  },
  {
    path: 'projects/:projectId/settings',
    title: 'ตั้งค่าโปรเจกต์ · Apo WMS',
    canActivate: [requireProjectSetup],
    canDeactivate: [confirmSetupLeave],
    loadComponent: () => import('./features/project-setup/setup-page').then((m) => m.SetupPage),
  },
  {
    path: 'login',
    title: 'เข้าสู่ระบบ · Apo WMS',
    canActivate: [requireGuest],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'password',
    title: 'เปลี่ยนรหัสผ่าน · Apo WMS',
    canActivate: [requireSession],
    loadComponent: () => import('./features/password/password').then((m) => m.Password),
  },
  {
    path: 'projects',
    title: 'เลือกโปรเจกต์ · Apo WMS',
    canActivate: [requirePasswordChanged],
    loadComponent: () => import('./features/projects/projects').then((m) => m.Projects),
  },
  {
    path: 'workspace/:projectId',
    title: 'พื้นที่ทำงาน · Apo WMS',
    canActivate: [requirePasswordChanged],
    loadComponent: () => import('./features/workspace/workspace').then((m) => m.Workspace),
  },
  {
    path: 'admin',
    title: 'จัดการระบบ · Apo WMS',
    canActivate: [requireAdmin],
    loadComponent: () => import('./features/admin/admin').then((m) => m.Admin),
  },
  { path: '**', redirectTo: 'login' },
];
