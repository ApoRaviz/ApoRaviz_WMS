import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SetupAudit, SetupDetail, modeLabels, roleLabels, statusLabels } from './setup.model';
@Component({
  selector: 'wms-setup-history',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (entry of detail().history; track entry.id) {
      <article class="setup-history-entry">
        <div>
          <strong>{{ sectionName(entry.section) }}</strong
          ><small
            >{{ entry.actorName }} · {{ entry.createdAt | date: 'dd/MM/yyyy HH:mm:ss' }}</small
          >
        </div>
        @for (line of lines(entry); track $index) {
          <p>{{ line }}</p>
        }
      </article>
    } @empty {
      <div class="empty-state">ยังไม่มีประวัติการแก้ไขในระบบตั้งค่าใหม่</div>
    }
  `,
})
export class SetupHistory {
  readonly detail = input.required<SetupDetail>();
  sectionName(s: string) {
    return (
      (
        {
          created: 'สร้างโปรเจกต์',
          general: 'ข้อมูลทั่วไป',
          warehouses: 'คลังสินค้า',
          rules: 'กฎของโปรเจกต์',
          members: 'สมาชิก',
          status: 'สถานะ',
        } as Record<string, string>
      )[s] ?? s
    );
  }
  lines(entry: SetupAudit): string[] {
    if (entry.section === 'members') {
      const previous = Array.isArray(entry.before) ? entry.before : [],
        next = Array.isArray(entry.after) ? entry.after : [];
      const describe = (v: Record<string, unknown>) =>
        `${v['name']} (${v['username']}) · ${roleLabels[v['roleId'] as keyof typeof roleLabels] ?? v['roleId']}${v['active'] ? '' : ' · ปิดใช้งาน'}`;
      return [
        ...previous
          .filter((p) => !next.some((n) => JSON.stringify(n) === JSON.stringify(p)))
          .map((p) => 'เดิม: ' + describe(p)),
        ...next
          .filter((n) => !previous.some((p) => JSON.stringify(n) === JSON.stringify(p)))
          .map((n) => 'ใหม่: ' + describe(n)),
      ];
    }
    const before = (entry.before ?? {}) as Record<string, unknown>,
      after = (entry.after ?? {}) as Record<string, unknown>;
    const keys =
      entry.section === 'created' ? ['code', 'name', 'clientId', 'status'] : Object.keys(after);
    const labels: Record<string, string> = {
      code: 'รหัส',
      name: 'ชื่อ',
      description: 'คำอธิบาย',
      accent: 'สี',
      clientId: 'Client',
      warehouseIds: 'คลังที่อนุญาต',
      defaultWarehouseId: 'คลังเริ่มต้น',
      lot: 'Lot',
      expiry: 'วันหมดอายุ',
      inspection: 'ตรวจสินค้าก่อนจัดเก็บ',
      status: 'สถานะ',
    };
    const display = (key: string, v: unknown): string => {
      if (v === null || v === undefined || v === '') return '—';
      if (key === 'clientId')
        return this.detail().catalog.clients.find((c) => c.id === v)?.name ?? String(v);
      if (key === 'warehouseIds' && Array.isArray(v))
        return v.map((id) => display('defaultWarehouseId', id)).join(', ') || '—';
      if (key === 'defaultWarehouseId')
        return this.detail().catalog.warehouses.find((w) => w.id === v)?.name ?? String(v);
      if (key === 'lot' || key === 'expiry')
        return modeLabels[v as keyof typeof modeLabels] ?? String(v);
      if (key === 'status') return statusLabels[v as keyof typeof statusLabels] ?? String(v);
      if (key === 'accent')
        return (
          ({ blue: 'น้ำเงิน', violet: 'ม่วง', teal: 'เขียว' } as Record<string, string>)[
            String(v)
          ] ?? String(v)
        );
      if (typeof v === 'boolean') return v ? 'เปิด' : 'ปิด';
      return String(v);
    };
    const lines = keys
      .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
      .map((k) => `${labels[k] ?? k}: ${display(k, before[k])} → ${display(k, after[k])}`);
    return lines.length ? lines : ['ยืนยันบันทึก โดยค่าไม่เปลี่ยนแปลง'];
  }
}
