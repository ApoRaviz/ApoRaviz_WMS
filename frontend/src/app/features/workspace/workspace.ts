import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { apiErrorMessage } from '../../core/http/api-error';
import type { Project } from '../projects/project.model';
import { SessionService } from '../../core/auth/session.service';
import { Icon } from '../../shared/icon';
import { Topbar } from '../../core/layout/topbar';

@Component({
  selector: 'wms-workspace',
  imports: [Topbar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace.html',
})
export class Workspace {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly project = signal<Project | null>(null);
  constructor() {
    void this.load();
  }
  private async load(): Promise<void> {
    try {
      this.project.set(
        await this.session.openWorkspace(this.route.snapshot.paramMap.get('projectId') ?? ''),
      );
    } catch (error) {
      this.error.set(apiErrorMessage(error, 'คุณไม่มีสิทธิ์เข้าถึงโปรเจกต์นี้'));
    } finally {
      this.loading.set(false);
    }
  }
  switchProject(): void {
    this.session.clearProject();
    void this.router.navigateByUrl('/projects');
  }
}
