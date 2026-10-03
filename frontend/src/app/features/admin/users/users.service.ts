import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ManagedUser, UserInput, UserUpdate, PasswordReset } from './user.model';
import { mutationHeaders } from '../../../core/http/mutation-headers';
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  listUsers(): Promise<ManagedUser[]> {
    return firstValueFrom(this.http.get<ManagedUser[]>('/api/admin/users'));
  }
  createUser(input: UserInput): Promise<ManagedUser> {
    return firstValueFrom(
      this.http.post<ManagedUser>('/api/admin/users', input, { headers: mutationHeaders }),
    );
  }
  updateUser(id: string, input: UserUpdate): Promise<ManagedUser> {
    return firstValueFrom(
      this.http.patch<ManagedUser>(`/api/admin/users/${encodeURIComponent(id)}`, input, {
        headers: mutationHeaders,
      }),
    );
  }
  resetPassword(id: string, password: string): Promise<{ ok: true }> {
    return firstValueFrom(
      this.http.post<{ ok: true }>(
        `/api/admin/users/${encodeURIComponent(id)}/reset-password`,
        { password } satisfies PasswordReset,
        { headers: mutationHeaders },
      ),
    );
  }
}
