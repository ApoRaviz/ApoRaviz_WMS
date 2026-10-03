import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { mutationHeaders } from '../../core/http/mutation-headers';
import type {
  CreateProjectInput,
  ProjectSummary,
  ReferenceCatalog,
  ReferenceItem,
  SectionInput,
  SetupDetail,
  WritableSection,
} from './setup.model';
@Injectable({ providedIn: 'root' })
export class SetupApi {
  private readonly http = inject(HttpClient);
  list() {
    return firstValueFrom(this.http.get<ProjectSummary[]>('/api/admin/project-setup'));
  }
  catalog() {
    return firstValueFrom(this.http.get<ReferenceCatalog>('/api/admin/project-reference-data'));
  }
  detail(id: string) {
    return firstValueFrom(
      this.http.get<SetupDetail>(`/api/projects/${encodeURIComponent(id)}/setup`),
    );
  }
  create(input: CreateProjectInput) {
    return firstValueFrom(
      this.http.post<SetupDetail>('/api/admin/project-setup', input, { headers: mutationHeaders }),
    );
  }
  save(id: string, section: WritableSection, input: SectionInput) {
    return firstValueFrom(
      this.http.patch<SetupDetail>(
        `/api/projects/${encodeURIComponent(id)}/setup/${section}`,
        input,
        { headers: mutationHeaders },
      ),
    );
  }
  status(id: string, version: number, status: 'active' | 'inactive') {
    return firstValueFrom(
      this.http.patch<SetupDetail>(
        `/api/projects/${encodeURIComponent(id)}/setup/status`,
        { version, status },
        { headers: mutationHeaders },
      ),
    );
  }
  createReference(kind: 'clients' | 'warehouses', input: { code: string; name: string }) {
    return firstValueFrom(
      this.http.post<ReferenceItem>(`/api/admin/project-reference-data/${kind}`, input, {
        headers: mutationHeaders,
      }),
    );
  }
}
