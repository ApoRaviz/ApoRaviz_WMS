import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { SetupDetail, SetupDraft } from '../../setup.model';
@Component({
  selector: 'wms-setup-warehouses',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './warehouse-fields.html',
})
export class WarehouseFields {
  readonly detail = input.required<SetupDetail>();
  readonly draft = input.required<SetupDraft>();
  readonly changed = output<void>();
  toggle(id: string, checked: boolean) {
    const d = this.draft();
    d.warehouseIds = checked ? [...d.warehouseIds, id] : d.warehouseIds.filter((v) => v !== id);
    if (!d.warehouseIds.includes(d.defaultWarehouseId ?? ''))
      d.defaultWarehouseId = d.warehouseIds[0] ?? null;
    this.changed.emit();
  }
}
