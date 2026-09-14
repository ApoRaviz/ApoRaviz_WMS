import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { apiErrorMessage, Project, SessionService } from '../../core/session';
import { Icon } from '../../shared/icon';
import { Topbar } from '../../shared/topbar';

@Component({
  selector: 'wms-workspace',
  imports: [Topbar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="flex min-h-dvh flex-col bg-canvas">
    <wms-topbar />
    @if (loading()) {
      <main id="main-content" tabindex="-1" class="page-shell">
        <p role="status">กำลังตรวจสอบสิทธิ์พื้นที่ทำงาน…</p>
      </main>
    } @else if (error()) {
      <main id="main-content" tabindex="-1" class="page-shell">
        <div class="empty-state">
          <wms-icon name="shield" />
          <h1 class="mt-4 text-2xl font-semibold">ไม่สามารถเปิดพื้นที่ทำงานได้</h1>
          <p class="mt-2 text-muted">{{ error() }}</p>
          <button class="secondary-button mt-5" (click)="switchProject()">
            กลับไปเลือกโปรเจกต์
          </button>
        </div>
      </main>
    } @else {
      <div class="mx-auto grid w-full max-w-7xl flex-1 lg:grid-cols-[245px_1fr]">
        <aside class="border-b border-line bg-white p-5 lg:border-r lg:border-b-0 lg:py-8">
          <p class="eyebrow mb-3">CURRENT PROJECT</p>
          <div class="flex items-center gap-3">
            <span class="avatar font-display">{{ project()?.name?.slice(0, 1) }}</span>
            <div>
              <p class="font-display text-lg font-bold">{{ project()?.name }}</p>
              <p class="text-xs text-muted">{{ project()?.roleName }}</p>
            </div>
          </div>
          <button
            type="button"
            class="secondary-button mt-5 w-full text-sm"
            (click)="switchProject()"
          >
            <wms-icon name="switch" />เปลี่ยนโปรเจกต์
          </button>
        </aside>
        <main id="main-content" tabindex="-1" class="min-w-0 px-5 py-9 sm:px-10 sm:py-12">
          <p class="eyebrow mb-3">PROJECT / {{ project()?.code }}</p>
          <h1 class="text-3xl leading-normal font-semibold">พื้นที่ทำงาน {{ project()?.name }}</h1>
          <p class="mt-2 text-muted">{{ project()?.client }} · บทบาท {{ project()?.roleName }}</p>
          <section class="mt-9 overflow-hidden rounded-2xl border border-line bg-white">
            <div class="workspace-illustration flex justify-center border-b border-line">
              <img
                src="warehouse.svg"
                alt=""
                width="440"
                height="250"
                class="w-full max-w-[440px]"
              />
            </div>
            <div class="p-7 sm:p-9">
              <h2 class="text-xl font-semibold">พร้อมเริ่มงานในโปรเจกต์นี้</h2>
              <p class="mt-3 max-w-lg leading-7 text-muted">
                เลือกงานที่ต้องการดำเนินการ โมดูลคลังสินค้าจะเพิ่มในขั้นตอนถัดไป
              </p>
              <div class="mt-6 flex items-center gap-2 text-sm text-emerald-800">
                <wms-icon name="check" /><span>โปรเจกต์ปัจจุบัน: {{ project()?.name }}</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    }
  </div>`,
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
