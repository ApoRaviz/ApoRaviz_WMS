import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { apiErrorMessage } from '../../core/http/api-error';
import { SessionService } from '../../core/auth/session.service';
import { Brand } from '../../shared/brand';
import { Icon } from '../../shared/icon';
import { Topbar } from '../../core/layout/topbar';

@Component({
  selector: 'wms-password',
  imports: [ReactiveFormsModule, Brand, Icon, Topbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './password.html',
})
export class Password {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly success = signal('');
  readonly showCurrentPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly forced = () => !!this.session.user()?.mustChangePassword;
  readonly form = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: Validators.required }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12), Validators.maxLength(128)],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  async submit(): Promise<void> {
    this.error.set('');
    this.success.set('');
    if (this.form.invalid) {
      this.error.set('กรุณากรอกข้อมูลให้ครบ และใช้รหัสผ่านใหม่ 12–128 ตัวอักษร');
      return;
    }
    const value = this.form.getRawValue();
    if (value.newPassword !== value.confirmPassword) {
      this.error.set('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }
    if (value.currentPassword === value.newPassword) {
      this.error.set('รหัสผ่านใหม่ต้องต่างจากรหัสผ่านปัจจุบัน');
      return;
    }
    const wasForced = this.forced();
    try {
      await this.session.changePassword(value.currentPassword, value.newPassword);
      this.form.reset();
      this.showCurrentPassword.set(false);
      this.showNewPassword.set(false);
      this.showConfirmPassword.set(false);
      if (wasForced) await this.router.navigateByUrl('/projects');
      else this.success.set('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    }
  }
  cancel(): void {
    void this.router.navigateByUrl('/projects');
  }
  async logout(): Promise<void> {
    try {
      this.error.set('');
      await this.session.logout();
      await this.router.navigateByUrl('/login');
    } catch (error) {
      this.error.set(
        `${apiErrorMessage(error, 'ไม่สามารถออกจากระบบได้')} กรุณาลองออกจากระบบอีกครั้ง`,
      );
    }
  }
}
