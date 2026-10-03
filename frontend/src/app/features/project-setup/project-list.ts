import { SetupDialog } from './setup-dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Topbar } from '../../core/layout/topbar';
import { apiErrorMessage } from '../../core/http/api-error';
import { SetupApi } from './setup-api.service';
import { CreateProjectInput, ProjectSummary, ReferenceCatalog, statusLabels } from './setup.model';
@Component({
  selector: 'wms-project-admin-list',
  imports: [SetupDialog, FormsModule, RouterLink, Topbar],
  templateUrl: './project-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectAdminList {
  private readonly api = inject(SetupApi);
  private readonly router = inject(Router);
  readonly projects = signal<ProjectSummary[]>([]);
  readonly catalog = signal<ReferenceCatalog>({ clients: [], warehouses: [] });
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly creating = signal(false);
  readonly query = signal('');
  readonly client = signal('');
  readonly status = signal('');
  readonly labels = statusLabels;
  readonly filtered = computed(() =>
    this.projects().filter(
      (p) =>
        (!this.client() || p.clientId === this.client()) &&
        (!this.status() || p.status === this.status()) &&
        `${p.code} ${p.name} ${p.client}`
          .toLocaleLowerCase()
          .includes(this.query().trim().toLocaleLowerCase()),
    ),
  );
  draft: CreateProjectInput = {
    code: '',
    name: '',
    clientId: '',
    description: '',
    accent: 'violet',
  };
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [p, c] = await Promise.all([this.api.list(), this.api.catalog()]);
      this.projects.set(p);
      this.catalog.set(c);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
  startCreate() {
    this.draft = { code: '', name: '', clientId: '', description: '', accent: 'violet' };
    this.error.set('');
    this.creating.set(true);
  }
  async create() {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const result = await this.api.create(this.draft);
      this.creating.set(false);
      await this.router.navigate(['/projects', result.project.id, 'settings']);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }
}
