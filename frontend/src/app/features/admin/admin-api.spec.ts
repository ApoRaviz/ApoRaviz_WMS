import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UsersService } from './users/users.service';
import { RolesService } from './roles/roles.service';
import { ProjectsService } from '../projects/projects.service';

describe('Feature API contracts', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('creates a user with memberships and the mutation header', async () => {
    const input = {
      username: 'worker',
      name: 'พนักงาน',
      password: 'temporary-password',
      isAdmin: false,
      memberships: [{ projectId: 'apo', roleId: 'operator' as const }],
    };
    const pending = TestBed.inject(UsersService).createUser(input);
    const req = http.expectOne('/api/admin/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-WMS-Request')).toBe('1');
    expect(req.request.body).toEqual(input);
    const response = {
      id: 'u1',
      username: 'worker',
      name: 'พนักงาน',
      isAdmin: false,
      active: true,
      mustChangePassword: true,
      memberships: input.memberships,
    };
    req.flush(response);
    expect(await pending).toEqual(response);
  });
  it('encodes a user ID and preserves update failures for the editor', async () => {
    const input = {
      name: 'พนักงาน',
      active: true,
      isAdmin: false,
      memberships: [],
      expectedMemberships: [],
    };
    const pending = TestBed.inject(UsersService).updateUser('u/1', input);
    const req = http.expectOne('/api/admin/users/u%2F1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.headers.get('X-WMS-Request')).toBe('1');
    expect(req.request.body).toEqual(input);
    req.flush({ message: 'Invalid membership' }, { status: 400, statusText: 'Bad Request' });
    await expect(pending).rejects.toBeInstanceOf(HttpErrorResponse);
  });
  it('resets passwords through the protected encoded endpoint', async () => {
    const pending = TestBed.inject(UsersService).resetPassword('u/1', 'temporary-password');
    const req = http.expectOne('/api/admin/users/u%2F1/reset-password');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-WMS-Request')).toBe('1');
    expect(req.request.body).toEqual({ password: 'temporary-password' });
    req.flush({ ok: true });
    expect(await pending).toEqual({ ok: true });
  });
  it('updates role permissions without changing the response contract', async () => {
    const pending = TestBed.inject(RolesService).updateRole('operator', []);
    const req = http.expectOne('/api/admin/roles/operator');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('X-WMS-Request')).toBe('1');
    expect(req.request.body).toEqual({ permissions: [] });
    req.flush({ id: 'operator', name: 'Operator', permissions: [] });
    expect(await pending).toEqual({ id: 'operator', name: 'Operator', permissions: [] });
  });
  it('loads admin catalogs through their owning services', async () => {
    const users = TestBed.inject(UsersService).listUsers();
    const roles = TestBed.inject(RolesService).listRoles();
    const projects = TestBed.inject(ProjectsService).listAdminProjects();
    http.expectOne('/api/admin/users').flush([]);
    http.expectOne('/api/admin/roles').flush({ roles: [], permissions: [] });
    http.expectOne('/api/admin/projects').flush([]);
    expect(await users).toEqual([]);
    expect(await roles).toEqual({ roles: [], permissions: [] });
    expect(await projects).toEqual([]);
  });
  it('requests server workspace authorization and propagates denial', async () => {
    const pending = TestBed.inject(ProjectsService).openWorkspace('p/1');
    const req = http.expectOne('/api/projects/p%2F1/workspace');
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'Project access denied' }, { status: 403, statusText: 'Forbidden' });
    await expect(pending).rejects.toBeInstanceOf(HttpErrorResponse);
  });
});
