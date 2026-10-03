import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Role, RoleId, RoleCatalog, RoleUpdate } from './role.model';
import { mutationHeaders } from '../../../core/http/mutation-headers';
@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  listRoles(): Promise<RoleCatalog> {
    return firstValueFrom(this.http.get<RoleCatalog>('/api/admin/roles'));
  }
  updateRole(id: RoleId, permissions: string[]): Promise<Role> {
    return firstValueFrom(
      this.http.put<Role>(`/api/admin/roles/${id}`, { permissions } satisfies RoleUpdate, {
        headers: mutationHeaders,
      }),
    );
  }
}
