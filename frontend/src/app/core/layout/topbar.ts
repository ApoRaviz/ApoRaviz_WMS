import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../http/api-error';
import { SessionService } from '../auth/session.service';
import { Brand } from '../../shared/brand';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'wms-topbar',
  imports: [Brand, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.html',
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
