import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage, SessionService } from '../../core/session';
import { Brand } from '../../shared/brand';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'wms-login',
  imports: [ReactiveFormsModule, Brand, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
})
export class Login {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly showPassword = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  invalid(field: 'username' | 'password'): boolean {
    return this.submitted() && this.form.controls[field].invalid;
  }
  async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set('');
    if (this.form.invalid) {
      document.getElementById(this.invalid('username') ? 'username' : 'password')?.focus();
      return;
    }
    try {
      const result = await this.session.login(
        this.form.controls.username.value,
        this.form.controls.password.value,
      );
      this.form.reset();
      await this.router.navigateByUrl(result.user.mustChangePassword ? '/password' : '/projects');
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse && error.status === 401
          ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง'
          : apiErrorMessage(error),
      );
    }
  }
}
