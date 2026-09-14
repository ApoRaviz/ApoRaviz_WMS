import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DemoSession } from '../../core/demo-session';
import { Topbar } from '../../shared/topbar';
import { Icon } from '../../shared/icon';

@Component({ selector: 'wms-projects', imports: [Topbar, Icon], changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: './projects.html' })
export class Projects {
  readonly session = inject(DemoSession);
  private readonly router = inject(Router);
  readonly query = signal('');
  readonly filtered = computed(() => {
    const term = this.query().trim().toLocaleLowerCase();
    return this.session.projects().filter(p => `${p.name} ${p.code}`.toLocaleLowerCase().includes(term));
  });
  updateQuery(event: Event): void { this.query.set((event.target as HTMLInputElement).value); }
  enter(id: string): void { if (this.session.selectProject(id)) void this.router.navigateByUrl('/workspace'); }
}
