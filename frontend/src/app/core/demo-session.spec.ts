import { TestBed } from '@angular/core/testing';
import { DemoSession } from './demo-session';

describe('Demo session workflow (not real authentication)', () => {
  let session: DemoSession;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    session = TestBed.inject(DemoSession);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());
  async function login(username = 'demo', password = 'demo123') {
    const result = session.login(username, password);
    await vi.runAllTimersAsync();
    return result;
  }
  it('rejects incorrect credentials without creating a session', async () => {
    expect(await login('demo', 'wrong')).toBe(false);
    expect(session.user()).toBeNull();
    expect(session.projects()).toEqual([]);
  });
  it('opens exactly the assigned Apo, Squ and Mdr projects after demo login', async () => {
    expect(await login()).toBe(true);
    expect(session.projects().map(p => p.name)).toEqual(['Apo', 'Squ', 'Mdr']);
    expect(session.selected()).toBeNull();
  });
  it('does not accept another login while the first request is pending', async () => {
    const first = session.login('demo', 'demo123');
    expect(session.pending()).toBe(true);
    expect(await session.login('empty', 'demo123')).toBe(false);
    await vi.runAllTimersAsync();
    expect(await first).toBe(true);
    expect(session.user()?.username).toBe('demo');
    expect(session.pending()).toBe(false);
  });
  it('only selects assigned projects and allows a deliberate project switch', async () => {
    expect(session.selectProject('apo')).toBe(false);
    await login();
    expect(session.selectProject('apo')).toBe(true);
    expect(session.selected()?.name).toBe('Apo');
    expect(session.selectProject('unknown')).toBe(false);
    expect(session.selected()?.name).toBe('Apo');
    session.clearProject();
    expect(session.selected()).toBeNull();
    expect(session.selectProject('squ')).toBe(true);
  });
  it('supports the no-assignment review scenario', async () => {
    expect(await login('empty')).toBe(true);
    expect(session.user()).not.toBeNull();
    expect(session.projects()).toEqual([]);
    expect(session.selectProject('apo')).toBe(false);
  });
  it('clears both project and identity when logging out', async () => {
    await login();
    session.selectProject('mdr');
    session.logout();
    expect(session.user()).toBeNull();
    expect(session.projects()).toEqual([]);
    expect(session.selected()).toBeNull();
  });
});
