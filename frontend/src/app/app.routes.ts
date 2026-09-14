import { Routes } from '@angular/router';
import { requireGuest, requireProject, requireSession } from './core/guards';

export const routes: Routes = [
  { path: 'login', title: 'เข้าสู่ระบบ · Apo WMS', canActivate: [requireGuest], loadComponent: () => import('./features/login/login').then(m => m.Login) },
  { path: 'projects', title: 'เลือกโปรเจกต์ · Apo WMS', canActivate: [requireSession], loadComponent: () => import('./features/projects/projects').then(m => m.Projects) },
  { path: 'workspace', title: 'พื้นที่ทำงาน · Apo WMS', canActivate: [requireProject], loadComponent: () => import('./features/workspace/workspace').then(m => m.Workspace) },
  { path: '**', redirectTo: 'login' },
];
