import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage, Session, SessionService } from './session';

const activeSession: Session = {
  user: {
    id: 'u1',
    username: 'mai',
    name: 'ใหม่',
    isAdmin: false,
    active: true,
    mustChangePassword: false,
  },
  projects: [
    {
      id: 'p1',
      code: 'APO',
      name: 'Apo',
      client: 'บริษัทตัวอย่าง',
      description: 'คลัง Apo',
      accent: 'blue',
      roleId: 'manager',
      roleName: 'ผู้จัดการ',
      permissions: ['workspace.view'],
    },
  ],
};

describe('SessionService', () => {
  let service: SessionService;
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('restores the cookie session once and validates the selected project against assignments', async () => {
    sessionStorage.setItem('wms.projectId', 'missing');
    const first = service.restore();
    const second = service.restore();
    expect(first).toBe(second);
    http.expectOne('/api/auth/me').flush(activeSession);
    await first;
    expect(service.user()?.username).toBe('mai');
    expect(service.selected()).toBeNull();
    expect(sessionStorage.getItem('wms.projectId')).toBeNull();
  });

  it('sends the mutation header and stores no credentials when logging in', async () => {
    const promise = service.login(' Mai ', 'a-private-password');
    const request = http.expectOne('/api/auth/login');
    expect(request.request.headers.get('X-WMS-Request')).toBe('1');
    expect(request.request.body).toEqual({ username: ' Mai ', password: 'a-private-password' });
    request.flush(activeSession);
    await promise;
    expect(service.user()?.id).toBe('u1');
    expect(Object.values(localStorage).join(' ')).not.toContain('a-private-password');
    expect(Object.values(sessionStorage).join(' ')).not.toContain('a-private-password');
  });

  it('clears identity and project preference after logout', async () => {
    const login = service.login('mai', 'a-private-password');
    http.expectOne('/api/auth/login').flush(activeSession);
    await login;
    service.selectProject('p1');
    const logout = service.logout();
    const request = http.expectOne('/api/auth/logout');
    expect(request.request.headers.get('X-WMS-Request')).toBe('1');
    request.flush({ ok: true });
    await logout;
    expect(service.session()).toBeNull();
    expect(sessionStorage.getItem('wms.projectId')).toBeNull();
  });

  it('retains the active session when logout cannot be confirmed by the server', async () => {
    const login = service.login('mai', 'a-private-password');
    http.expectOne('/api/auth/login').flush(activeSession);
    await login;
    service.selectProject('p1');

    const logout = service.logout();
    http
      .expectOne('/api/auth/logout')
      .flush(
        { message: 'Service unavailable' },
        { status: 503, statusText: 'Service Unavailable' },
      );

    await expect(logout).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(service.user()?.id).toBe('u1');
    expect(service.selected()?.id).toBe('p1');
    expect(sessionStorage.getItem('wms.projectId')).toBe('p1');
  });

  it('replaces the session after changing password and requests backend workspace authorization', async () => {
    const forced = { ...activeSession, user: { ...activeSession.user, mustChangePassword: true } };
    const login = service.login('mai', 'temporary-password');
    http.expectOne('/api/auth/login').flush(forced);
    await login;
    const changed = service.changePassword('temporary-password', 'a-new-private-password');
    const passwordRequest = http.expectOne('/api/auth/password');
    expect(passwordRequest.request.headers.get('X-WMS-Request')).toBe('1');
    passwordRequest.flush(activeSession);
    await changed;
    expect(service.user()?.mustChangePassword).toBe(false);
    const workspace = service.openWorkspace('p1');
    http.expectOne('/api/projects/p1/workspace').flush({ project: activeSession.projects[0] });
    await workspace;
    expect(service.selected()?.id).toBe('p1');
  });
});

describe('apiErrorMessage', () => {
  it('translates common backend account errors into Thai', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { message: 'Username already exists' },
    });
    expect(apiErrorMessage(error)).toBe('ชื่อผู้ใช้นี้มีอยู่แล้ว');
  });

  it('translates each message in a Nest validation array', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: ['Invalid username', 'Password must be 12 to 128 characters'] },
    });
    expect(apiErrorMessage(error)).toBe(
      'รูปแบบชื่อผู้ใช้ไม่ถูกต้อง รหัสผ่านต้องมี 12–128 ตัวอักษร',
    );
  });
});
