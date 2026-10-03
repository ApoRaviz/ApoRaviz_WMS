import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Session, LoginInput, PasswordChangeInput } from './session.model';
import { mutationHeaders } from '../http/mutation-headers';
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  restore(): Promise<Session> {
    return firstValueFrom(this.http.get<Session>('/api/auth/me'));
  }
  login(input: LoginInput): Promise<Session> {
    return firstValueFrom(
      this.http.post<Session>('/api/auth/login', input, { headers: mutationHeaders }),
    );
  }
  logout(): Promise<{ ok: true }> {
    return firstValueFrom(
      this.http.post<{ ok: true }>('/api/auth/logout', {}, { headers: mutationHeaders }),
    );
  }
  changePassword(input: PasswordChangeInput): Promise<Session> {
    return firstValueFrom(
      this.http.post<Session>('/api/auth/password', input, { headers: mutationHeaders }),
    );
  }
}
