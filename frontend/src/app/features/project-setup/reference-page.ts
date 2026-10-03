import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Topbar } from '../../core/layout/topbar';
import { apiErrorMessage } from '../../core/http/api-error';
import { SetupApi } from './setup-api.service';
import { ReferenceCatalog } from './setup.model';
@Component({
  selector: 'wms-project-references',
  imports: [Topbar, RouterLink, FormsModule],
  templateUrl: './reference-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferencePage {
  private readonly api = inject(SetupApi);
  readonly catalog = signal<ReferenceCatalog>({ clients: [], warehouses: [] });
  readonly error = signal('');
  readonly success = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly groups = [
    {
      kind: 'clients',
      title: 'Client',
      description: 'บริษัทที่ใช้บริการ WMS หนึ่ง Client มีหลายโปรเจกต์ได้',
    },
    {
      kind: 'warehouses',
      title: 'คลังสินค้า',
      description: 'คลังส่วนกลางที่หลายโปรเจกต์เลือกใช้ร่วมกันได้',
    },
  ] as const;
  drafts = { clients: { code: '', name: '' }, warehouses: { code: '', name: '' } };
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.catalog.set(await this.api.catalog());
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
  async create(kind: 'clients' | 'warehouses') {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    try {
      const item = await this.api.createReference(kind, this.drafts[kind]);
      this.catalog.update((c) => ({ ...c, [kind]: [...c[kind], item] }));
      this.drafts[kind] = { code: '', name: '' };
      this.success.set('เพิ่มข้อมูลกลางเรียบร้อยแล้ว');
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }
}
