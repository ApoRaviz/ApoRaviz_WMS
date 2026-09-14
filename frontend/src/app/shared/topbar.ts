import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Brand } from './brand';
import { Icon } from './icon';
import { DemoSession } from '../core/demo-session';

@Component({
  selector: 'wms-topbar', imports: [Brand, Icon], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="border-b border-line bg-white px-5 sm:px-10">
      <div class="mx-auto flex min-h-22 max-w-7xl flex-wrap items-center justify-between gap-3 py-4">
        <wms-brand />
        <div class="flex items-center gap-3 sm:gap-5">
          <span class="demo-badge hidden sm:inline-flex"><span></span>โหมดสาธิต</span>
          <div class="hidden h-8 w-px bg-line sm:block"></div>
          <span class="avatar">D</span>
          <div class="hidden sm:block"><p class="text-sm font-semibold">{{ session.user()?.name }}</p><p class="text-xs text-muted">บัญชีทดลองใช้งาน</p></div>
          <button type="button" class="icon-button" aria-label="ออกจากระบบ" title="ออกจากระบบ" (click)="logout()"><wms-icon name="logout" /></button>
        </div>
      </div>
    </header>`,
})
export class Topbar {
  readonly session = inject(DemoSession);
  private readonly router = inject(Router);
  logout(): void { this.session.logout(); void this.router.navigateByUrl('/login'); }
}
