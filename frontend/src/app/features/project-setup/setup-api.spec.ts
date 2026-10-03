import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SetupApi } from './setup-api.service';
describe('Project setup API', () => {
  let api: SetupApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SetupApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends section version and mutation header to the scoped endpoint', async () => {
    const result = api.save('project/one', 'general', {
      version: 3,
      name: 'Changed',
      description: '',
      accent: 'violet',
    });
    const req = http.expectOne('/api/projects/project%2Fone/setup/general');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.headers.get('X-WMS-Request')).toBe('1');
    expect(req.request.body.version).toBe(3);
    req.flush({ project: { version: 4 } });
    await result;
  });
  it('propagates stale-version conflict so the form can retain edits', async () => {
    const promise = api.save('p', 'rules', {
      version: 2,
      lot: 'item',
      expiry: 'off',
      inspection: true,
    });
    const check = expect(promise).rejects.toMatchObject({ status: 409 });
    http
      .expectOne('/api/projects/p/setup/rules')
      .flush({ message: 'มีผู้อื่นแก้ไขข้อมูลแล้ว' }, { status: 409, statusText: 'Conflict' });
    await check;
  });
});
