import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DemoSession } from '../../core/demo-session';
import { Topbar } from '../../shared/topbar';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'wms-workspace', imports: [Topbar, Icon], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col bg-canvas">
      <wms-topbar />
      <div class="mx-auto grid w-full max-w-7xl flex-1 lg:grid-cols-[245px_1fr]">
        <aside class="border-b border-line bg-white p-5 lg:border-r lg:border-b-0 lg:py-8">
          <p class="eyebrow mb-3">CURRENT PROJECT</p>
          <div class="flex items-center gap-3"><span class="avatar font-display">{{ session.selected()?.name?.slice(0, 1) }}</span><div><p class="font-display text-lg font-bold">{{ session.selected()?.name }}</p><p class="text-xs text-muted">บริษัทตัวอย่าง</p></div></div>
          <button type="button" class="secondary-button mt-5 w-full text-sm" (click)="switchProject()"><wms-icon name="switch" />เปลี่ยนโปรเจกต์</button>
          <div class="mt-8 hidden items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 font-medium text-primary lg:flex" aria-current="page"><wms-icon name="grid" />พื้นที่ทำงาน</div>
        </aside>
        <main id="main-content" tabindex="-1" class="min-w-0 px-5 py-9 sm:px-10 sm:py-12">
          <p class="eyebrow mb-3">PROJECT / {{ session.selected()?.code }}</p>
          <h1 class="text-3xl leading-normal font-semibold">พื้นที่ทำงาน {{ session.selected()?.name }}</h1>
          <p class="mt-2 text-muted">คุณกำลังใช้งานโปรเจกต์ {{ session.selected()?.name }} ภายใต้บริษัทตัวอย่าง</p>
          <section class="mt-9 overflow-hidden rounded-2xl border border-line bg-white">
            <div class="workspace-illustration flex justify-center border-b border-line"><img src="warehouse.svg" alt="" width="440" height="250" class="w-full max-w-[440px]" /></div>
            <div class="p-7 sm:p-9"><span class="demo-badge"><span></span>โหมดสาธิต</span><h2 class="mt-4 text-xl font-semibold">เลือกโปรเจกต์เรียบร้อยแล้ว</h2><p class="mt-3 max-w-lg leading-7 text-muted">ต้นแบบรอบนี้ใช้ทดลองเข้าสู่ระบบและเลือกพื้นที่ทำงาน<br class="hidden sm:block" />ฟังก์ชันรับเข้า สต็อก และจ่ายออกจะพัฒนาในขั้นถัดไป</p><div class="mt-6 flex items-center gap-2 text-sm text-emerald-800"><wms-icon name="check" /><span>โปรเจกต์ปัจจุบัน: {{ session.selected()?.name }}</span></div></div>
          </section>
        </main>
      </div>
    </div>`,
})
export class Workspace {
  readonly session = inject(DemoSession);
  private readonly router = inject(Router);
  switchProject(): void { this.session.clearProject(); void this.router.navigateByUrl('/projects'); }
}
