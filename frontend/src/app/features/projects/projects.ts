import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/session';
import { Icon } from '../../shared/icon';
import { Topbar } from '../../shared/topbar';

@Component({
  selector: 'wms-projects',
  imports: [Topbar, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projects.html',
})
export class Projects {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly query = signal('');
  readonly filtered = computed(() => {
    const term = this.query().trim().toLocaleLowerCase();
    return this.session
      .projects()
      .filter((p) => `${p.name} ${p.code}`.toLocaleLowerCase().includes(term));
  });
  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  clearQuery(): void {
    this.query.set('');
  }
  enter(id: string): void {
    void this.router.navigate(['/workspace', id]);
  }
}
