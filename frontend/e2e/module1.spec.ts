import { randomBytes } from 'node:crypto';
import { expect, test, request as apiRequest, APIRequestContext, Page } from '@playwright/test';

const adminUsername = process.env['E2E_ADMIN_USERNAME'];
const adminTemporaryPassword = process.env['E2E_ADMIN_TEMP_PASSWORD'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];
if (!adminUsername || !adminTemporaryPassword || !adminPassword) {
  throw new Error('Run e2e.cmd from the repository root to use an isolated database and ephemeral test accounts.');
}
let admin: APIRequestContext;
const headers = { 'X-WMS-Request': '1', Origin: 'http://localhost:4200' };

async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('ชื่อผู้ใช้', { exact: true }).fill(username);
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
}

async function account(memberships: {projectId: string; roleId: string}[], change = true) {
  const username = `user_${randomBytes(5).toString('hex')}`;
  const temporaryPassword = randomBytes(18).toString('base64url');
  const password = randomBytes(18).toString('base64url');
  const response = await admin.post('/api/admin/users', {
    data: { username, name: 'ผู้ใช้งานทดสอบ', password: temporaryPassword, isAdmin: false, memberships },
  });
  expect(response.status(), await response.text()).toBeLessThan(300);
  const user = await response.json();
  if (change) {
    const client = await apiRequest.newContext({ baseURL: 'http://localhost:4200', extraHTTPHeaders: headers });
    expect((await client.post('/api/auth/login', { data: { username, password: temporaryPassword } })).ok()).toBeTruthy();
    expect((await client.post('/api/auth/password', { data: { currentPassword: temporaryPassword, newPassword: password } })).ok()).toBeTruthy();
    await client.dispose();
  }
  return { ...user, username, password: change ? password : temporaryPassword, nextPassword: password };
}

test.beforeAll(async () => {
  admin = await apiRequest.newContext({ baseURL: 'http://localhost:4200', extraHTTPHeaders: headers });
  // Playwright restarts a worker after failure; reuse the already-changed isolated admin.
  const restored = await admin.post('/api/auth/login', { data: { username: adminUsername, password: adminPassword } });
  if (!restored.ok()) {
    const response = await admin.post('/api/auth/login', { data: { username: adminUsername, password: adminTemporaryPassword } });
    expect(response.status(), await response.text()).toBeLessThan(300);
    expect((await admin.post('/api/auth/password', { data: { currentPassword: adminTemporaryPassword, newPassword: adminPassword } })).ok()).toBeTruthy();
  }
});
test.afterAll(async () => { await admin?.dispose(); });

test('real login, project-specific roles, reload, project switch and logout', async ({ page }) => {
  const user = await account([{ projectId: 'apo', roleId: 'manager' }, { projectId: 'squ', roleId: 'operator' }]);
  await page.goto('/workspace');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page.getByText('กรุณากรอกชื่อผู้ใช้', { exact: true })).toBeVisible();
  await login(page, user.username, 'incorrect-password');
  await expect(page.getByRole('alert')).toContainText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'แสดงรหัสผ่าน', exact: true }).click();
  await expect(page.getByLabel('รหัสผ่าน', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('button', { name: 'เข้าโปรเจกต์ Mdr' })).toHaveCount(0);
  await expect(page.getByText('Manager', { exact: true })).toBeVisible();
  await expect(page.getByText('Operator', { exact: true })).toBeVisible();
  await page.getByLabel('ค้นหาโปรเจกต์').fill('sQU');
  await expect(page.getByRole('button', { name: 'เข้าโปรเจกต์ Apo' })).toHaveCount(0);
  await page.getByLabel('ค้นหาโปรเจกต์').fill('missing');
  await expect(page.getByRole('heading', { name: 'ไม่พบโปรเจกต์' })).toBeVisible();
  await page.getByRole('button', { name: 'ล้างการค้นหา' }).click();
  await page.getByRole('button', { name: 'เข้าโปรเจกต์ Apo' }).click();
  await expect(page.getByRole('heading', { name: 'พื้นที่ทำงาน Apo' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'พื้นที่ทำงาน Apo' })).toBeVisible();
  const denied = await page.request.get('/api/projects/mdr/workspace');
  expect(denied.status()).toBe(403);
  expect((await page.request.get('/api/admin/users')).status()).toBe(403);
  await page.getByRole('button', { name: 'เปลี่ยนโปรเจกต์', exact: true }).click();
  await page.getByRole('button', { name: 'เข้าโปรเจกต์ Squ' }).click();
  await expect(page.getByRole('heading', { name: 'พื้นที่ทำงาน Squ' })).toBeVisible();
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login$/);
});

test('empty assignments and keyboard skip link preserve the real session', async ({ page }) => {
  const user = await account([]);
  await login(page, user.username, user.password);
  await expect(page.getByRole('heading', { name: 'ยังไม่มีโปรเจกต์ที่ได้รับสิทธิ์' })).toBeVisible();
  await page.getByRole('link', { name: 'ข้ามไปเนื้อหาหลัก' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page).toHaveURL(/\/projects$/);
  expect((await page.request.get('/api/auth/me')).ok()).toBeTruthy();
});

test('disabled account loses access on the next request', async ({ page }) => {
  const memberships = [{ projectId: 'apo', roleId: 'operator' }];
  const user = await account(memberships);
  await login(page, user.username, user.password);
  await expect(page).toHaveURL(/\/projects$/);
  expect((await admin.patch(`/api/admin/users/${user.id}`, {
    data: { name: user.name, active: false, isAdmin: false, memberships },
  })).ok()).toBeTruthy();
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});

test('temporary password must change before project access', async ({ page }) => {
  const user = await account([{ projectId: 'apo', roleId: 'supervisor' }], false);
  await login(page, user.username, user.password);
  await expect(page).toHaveURL(/\/password$/);
  expect((await page.request.get('/api/projects/apo/workspace')).status()).toBe(403);
  await page.getByLabel('รหัสผ่านปัจจุบัน', { exact: true }).fill(user.password);
  await page.getByLabel('รหัสผ่านใหม่', { exact: true }).fill(user.nextPassword);
  await page.getByLabel('ยืนยันรหัสผ่านใหม่', { exact: true }).fill(user.nextPassword);
  await page.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole('button', { name: 'เข้าโปรเจกต์ Apo' }).click();
  await expect(page.getByRole('heading', { name: 'พื้นที่ทำงาน Apo' })).toBeVisible();
});

test('mobile login and projects fit 360px', async ({ page }) => {
  const user = await account([{ projectId: 'apo', roleId: 'customer' }]);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/login');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/module1-login-mobile.png', fullPage: true });
  await login(page, user.username, user.password);
  await expect(page.getByRole('button', { name: 'เข้าโปรเจกต์ Apo' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/module1-projects-mobile.png', fullPage: true });
});

test('administrator creates project memberships, edits permissions and disables a user through UI', async ({ page }) => {
  const username = `ui_${randomBytes(5).toString('hex')}`;
  const temporaryPassword = randomBytes(18).toString('base64url');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/login');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/module1-login-desktop.png', fullPage: true });
  await login(page, adminUsername!, adminPassword!);
  await expect(page.getByRole('button', { name: 'เข้าโปรเจกต์ Mdr' })).toBeVisible();
  await page.screenshot({ path: 'test-results/module1-projects-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'จัดการระบบ', exact: true }).click();
  await page.getByRole('button', { name: 'เพิ่มผู้ใช้งาน', exact: true }).click();
  await page.getByLabel('ชื่อผู้ใช้', { exact: true }).fill(username);
  await page.getByLabel('ชื่อที่แสดง', { exact: true }).fill('ทดสอบสร้างผ่านหน้าจอ');
  await page.getByLabel('รหัสผ่านชั่วคราว', { exact: true }).fill(temporaryPassword);
  await page.getByLabel('บทบาทในโปรเจกต์ Apo', { exact: true }).selectOption('manager');
  await page.getByLabel('บทบาทในโปรเจกต์ Squ', { exact: true }).selectOption('operator');
  await page.getByRole('button', { name: 'บันทึกผู้ใช้งาน', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('บันทึกผู้ใช้งานเรียบร้อยแล้ว');
  const card = page.locator('article').filter({ hasText: username });
  await expect(card).toContainText('Manager');
  await expect(card).toContainText('Operator');
  await page.screenshot({ path: 'test-results/module1-admin-desktop.png', fullPage: true });
  const client = await apiRequest.newContext({ baseURL: 'http://localhost:4200', extraHTTPHeaders: headers });
  try {
    expect((await client.post('/api/auth/login', { data: { username, password: temporaryPassword } })).ok()).toBeTruthy();
    expect((await client.post('/api/auth/password', { data: { currentPassword: temporaryPassword, newPassword: randomBytes(18).toString('base64url') } })).ok()).toBeTruthy();
    await page.getByRole('tab', { name: 'สิทธิ์ตามบทบาท', exact: true }).click();
    const operator = page.locator('.role-row').filter({ has: page.getByRole('heading', { name: 'Operator', exact: true }) });
    await operator.getByRole('checkbox').uncheck();
    await operator.getByRole('button', { name: 'บันทึกสิทธิ์', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Operator');
    expect((await client.get('/api/projects/squ/workspace')).status()).toBe(403);
    expect((await client.get('/api/projects/apo/workspace')).status()).toBe(200);
    await operator.getByRole('checkbox').check();
    await operator.getByRole('button', { name: 'บันทึกสิทธิ์', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Operator');
    await page.setViewportSize({ width: 360, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/module1-roles-mobile.png', fullPage: true });
    await page.getByRole('tab', { name: 'ผู้ใช้งาน', exact: true }).click();
    await card.getByRole('button', { name: 'แก้ไข', exact: true }).click();
    await expect(page.getByLabel('บทบาทในโปรเจกต์ Apo', { exact: true })).toHaveValue('manager');
    await expect(page.getByLabel('บทบาทในโปรเจกต์ Squ', { exact: true })).toHaveValue('operator');
    await page.getByLabel('ชื่อที่แสดง', { exact: true }).fill('แก้ไขชื่อผ่านหน้าจอ');
    await page.getByLabel('เปิดใช้งานบัญชี', { exact: true }).uncheck();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.getByRole('link', { name: 'ข้ามไปเนื้อหาหลัก' }).evaluate(el => el.getBoundingClientRect().bottom <= 0)).toBe(true);
    await page.screenshot({ path: 'test-results/module1-user-edit-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'บันทึกผู้ใช้งาน', exact: true }).click();
    await expect(card).toContainText('แก้ไขชื่อผ่านหน้าจอ');
    await expect(card).toContainText('ปิดใช้งาน');
    expect((await client.get('/api/auth/me')).status()).toBe(401);
  } finally { await client.dispose(); }
});

test('administrator resets a password through a masked form and revokes the user session', async ({ page }) => {
  const user = await account([{ projectId: 'apo', roleId: 'operator' }]);
  const client = await apiRequest.newContext({ baseURL: 'http://localhost:4200', extraHTTPHeaders: headers });
  const resetPassword = randomBytes(18).toString('base64url');
  try {
    expect((await client.post('/api/auth/login', { data: { username: user.username, password: user.password } })).ok()).toBeTruthy();
    await login(page, adminUsername!, adminPassword!);
    await page.getByRole('link', { name: 'จัดการระบบ', exact: true }).click();
    await page.locator('article').filter({ hasText: user.username }).getByRole('button', { name: 'รีเซ็ตรหัสผ่าน', exact: true }).click();
    await expect(page.getByLabel('รหัสผ่านชั่วคราวใหม่', { exact: true })).toHaveAttribute('type', 'password');
    await page.getByLabel('รหัสผ่านชั่วคราวใหม่', { exact: true }).fill(resetPassword);
    await page.getByRole('button', { name: 'ยืนยันรีเซ็ตรหัสผ่าน', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('รีเซ็ตรหัสผ่านเรียบร้อยแล้ว');
    expect((await client.get('/api/auth/me')).status()).toBe(401);
    const signedIn = await client.post('/api/auth/login', { data: { username: user.username, password: resetPassword } });
    expect(signedIn.ok()).toBeTruthy();
    expect((await signedIn.json()).user.mustChangePassword).toBe(true);
  } finally { await client.dispose(); }
});

test('failed logout shows an error and permits a successful retry', async ({ page }) => {
  const user = await account([{ projectId: 'apo', roleId: 'operator' }]);
  await login(page, user.username, user.password);
  await expect(page).toHaveURL(/\/projects$/);
  await page.route('**/api/auth/logout', route => route.fulfill({
    status: 503, json: { statusCode: 503, message: 'Service unavailable' },
  }));
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/projects$/);
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);
  await page.unroute('**/api/auth/logout');
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
});
