import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage, SessionService } from '../core/session';
import { Brand } from './brand';
import { Icon } from './icon';

@Component({
  selector: 'wms-topbar',
  imports: [Brand, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <header class="border-b border-line bg-white px-4 sm:px-10">
    <div class="mx-auto flex min-h-22 max-w-7xl flex-wrap items-center justify-between gap-3 py-4">
      <a routerLink="/projects" aria-label="ไปหน้าเลือกโปรเจกต์"><wms-brand /></a>
      <nav aria-label="เมนูบัญชี" class="flex items-center gap-1 sm:gap-3">
        @if (session.user()?.isAdmin) {
          <a routerLink="/admin" class="nav-link">จัดการระบบ</a>
        }
        <a routerLink="/password" class="nav-link"
          ><span class="sm:hidden">รหัสผ่าน</span
          ><span class="hidden sm:inline">เปลี่ยนรหัสผ่าน</span></a
        >
        <span class="avatar hidden sm:flex">{{ session.user()?.name?.slice(0, 1) }}</span>
        <div class="hidden md:block">
          <p class="text-sm font-semibold">{{ session.user()?.name }}</p>
          <p class="text-xs text-muted">
            {{ session.user()?.isAdmin ? 'ผู้ดูแลระบบ' : session.user()?.username }}
          </p>
        </div>
        <button
          type="button"
          class="icon-button"
          aria-label="ออกจากระบบ"
          title="ออกจากระบบ"
          [disabled]="session.pending()"
          (click)="logout()"
        >
          <wms-icon name="logout" />
        </button>
      </nav>
    </div>
    @if (logoutError()) {
      <div class="mx-auto max-w-7xl pb-4">
        <div role="alert" class="alert-error">
          <wms-icon name="info" /><span>{{ logoutError() }} กรุณาลองออกจากระบบอีกครั้ง</span>
        </div>
      </div>
    }
  </header>`,
})
export class Topbar {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly logoutError = signal('');
  async logout(): Promise<void> {
    try {
      this.logoutError.set('');
      await this.session.logout();
      await this.router.navigateByUrl('/login');
    } catch (error) {
      this.logoutError.set(apiErrorMessage(error, 'ไม่สามารถออกจากระบบได้'));
    }
  }
}
