import { Injectable, signal } from '@angular/core';

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  description: string;
  accent: 'blue' | 'violet' | 'teal';
}
export interface DemoUser { name: string; username: string; }

const PROJECTS: readonly Project[] = [
  { id: 'apo', code: 'APO', name: 'Apo', client: 'บริษัทตัวอย่าง', description: 'พื้นที่ทำงานสำหรับโปรเจกต์ Apo', accent: 'blue' },
  { id: 'squ', code: 'SQU', name: 'Squ', client: 'บริษัทตัวอย่าง', description: 'พื้นที่ทำงานสำหรับโปรเจกต์ Squ', accent: 'violet' },
  { id: 'mdr', code: 'MDR', name: 'Mdr', client: 'บริษัทตัวอย่าง', description: 'พื้นที่ทำงานสำหรับโปรเจกต์ Mdr', accent: 'teal' },
];

@Injectable({ providedIn: 'root' })
export class DemoSession {
  private readonly currentUser = signal<DemoUser | null>(null);
  private readonly assignedProjects = signal<readonly Project[]>([]);
  private readonly currentProject = signal<Project | null>(null);
  private readonly isPending = signal(false);
  readonly user = this.currentUser.asReadonly();
  readonly projects = this.assignedProjects.asReadonly();
  readonly selected = this.currentProject.asReadonly();
  readonly pending = this.isPending.asReadonly();

  // Deliberately local demonstration. Replace this boundary with the real API later.
  async login(username: string, password: string): Promise<boolean> {
    if (this.isPending()) return false;
    this.isPending.set(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 650));
      const normalized = username.trim();
      if (!['demo', 'empty'].includes(normalized) || password !== 'demo123') return false;
      this.currentUser.set({ username: normalized, name: 'ผู้ใช้งานสาธิต' });
      this.assignedProjects.set(normalized === 'demo' ? PROJECTS : []);
      this.currentProject.set(null);
      return true;
    } finally {
      this.isPending.set(false);
    }
  }
  selectProject(id: string): boolean {
    const project = this.assignedProjects().find(project => project.id === id);
    if (!this.currentUser() || !project) return false;
    this.currentProject.set(project);
    return true;
  }
  clearProject(): void { this.currentProject.set(null); }
  logout(): void {
    this.currentUser.set(null);
    this.assignedProjects.set([]);
    this.currentProject.set(null);
  }
}
