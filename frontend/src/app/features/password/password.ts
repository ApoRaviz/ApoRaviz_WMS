import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { apiErrorMessage, SessionService } from '../../core/session';
import { Brand } from '../../shared/brand';
import { Icon } from '../../shared/icon';
import { Topbar } from '../../shared/topbar';

@Component({
  selector: 'wms-password',
  imports: [ReactiveFormsModule, Brand, Icon, Topbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col bg-canvas">
      @if (!forced()) {
        <wms-topbar />
      } @else {
        <header class="border-b border-line bg-white px-5 py-5 sm:px-10">
          <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <wms-brand />
            <button
              type="button"
              class="secondary-button"
              [disabled]="session.pending()"
              (click)="logout()"
            >
              ออกจากระบบ
            </button>
          </div>
        </header>
      }
      <main
        id="main-content"
        tabindex="-1"
        class="mx-auto w-full max-w-xl flex-1 px-5 py-10 sm:px-10 sm:py-14"
      >
        <section class="surface-card p-6 sm:p-9">
          <span
            class="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-brand-50 text-primary"
            ><wms-icon name="lock"
          /></span>
          <p class="eyebrow mb-2">ACCOUNT SECURITY</p>
          <h1 class="text-3xl font-semibold">เปลี่ยนรหัสผ่าน</h1>
          <p class="mt-2 leading-7 text-muted">
            {{
              forced()
                ? 'นี่คือการเข้าสู่ระบบครั้งแรก กรุณาตั้งรหัสผ่านใหม่ก่อนดำเนินการต่อ'
                : 'ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ'
            }}
          </p>
          <form class="mt-8 space-y-5" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div>
              <label class="field-label" for="currentPassword">รหัสผ่านปัจจุบัน</label>
              <div class="input-wrap">
                <wms-icon name="lock" /><input
                  id="currentPassword"
                  type="password"
                  formControlName="currentPassword"
                  autocomplete="current-password"
                />
              </div>
            </div>
            <div>
              <label class="field-label" for="newPassword">รหัสผ่านใหม่</label>
              <div class="input-wrap">
                <wms-icon name="lock" /><input
                  id="newPassword"
                  type="password"
                  formControlName="newPassword"
                  autocomplete="new-password"
                  aria-describedby="password-hint"
                />
              </div>
              <p id="password-hint" class="mt-2 text-xs text-muted">
                ใช้ 12–128 ตัวอักษร และต้องต่างจากรหัสผ่านปัจจุบัน
              </p>
            </div>
            <div>
              <label class="field-label" for="confirmPassword">ยืนยันรหัสผ่านใหม่</label>
              <div class="input-wrap">
                <wms-icon name="lock" /><input
                  id="confirmPassword"
                  type="password"
                  formControlName="confirmPassword"
                  autocomplete="new-password"
                />
              </div>
            </div>
            @if (error()) {
              <div role="alert" class="alert-error">
                <wms-icon name="info" /><span>{{ error() }}</span>
              </div>
            }
            @if (success()) {
              <div role="status" class="alert-success">
                <wms-icon name="check" /><span>{{ success() }}</span>
              </div>
            }
            <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              @if (!forced()) {
                <button type="button" class="secondary-button" (click)="cancel()">ยกเลิก</button>
              }
              <button type="submit" class="primary-button" [disabled]="session.pending()">
                {{ session.pending() ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน' }}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  `,
})
export class Password {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly success = signal('');
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
