import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DemoSession } from '../../core/demo-session';
import { Brand } from '../../shared/brand';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'wms-login', imports: [ReactiveFormsModule, Brand, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: './login.html',
})
export class Login {
  readonly session = inject(DemoSession);
  private readonly router = inject(Router);
  readonly showPassword = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  invalid(field: 'username' | 'password'): boolean { return this.submitted() && this.form.controls[field].invalid; }
  fillDemo(): void {
    this.form.setValue({ username: 'demo', password: 'demo123' });
    this.error.set('');
  }
  async submit(): Promise<void> {
    if (this.session.pending()) return;
    this.submitted.set(true);
    this.error.set('');
    if (this.form.invalid) {
      document.getElementById(this.invalid('username') ? 'username' : 'password')?.focus();
      return;
    }
    const { username, password } = this.form.getRawValue();
    if (await this.session.login(username, password)) {
      this.form.reset();
      await this.router.navigateByUrl('/projects');
    } else { this.error.set('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง'); }
  }
}
