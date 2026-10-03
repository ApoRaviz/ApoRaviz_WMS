import { randomBytes } from 'node:crypto';
import { expect, test, request as apiRequest, APIRequestContext, Page } from '@playwright/test';
const username = process.env['E2E_ADMIN_USERNAME']!,
  password = process.env['E2E_ADMIN_PASSWORD']!,
  temporary = process.env['E2E_ADMIN_TEMP_PASSWORD']!;
if (!username || !password || !temporary) throw new Error('Use the isolated e2e runner.');
let admin: APIRequestContext;
const headers = { 'X-WMS-Request': '1', Origin: 'http://localhost:4200' };
const suffix = () => randomBytes(4).toString('hex');
async function login(page: Page, user = username, pass = password) {
  await page.goto('/login');
  await page.getByLabel('ชื่อผู้ใช้', { exact: true }).fill(user);
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill(pass);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
}
test.beforeAll(async () => {
  admin = await apiRequest.newContext({
    baseURL: 'http://localhost:4200',
    extraHTTPHeaders: headers,
  });
  if (!(await admin.post('/api/auth/login', { data: { username, password } })).ok()) {
    expect(
      (await admin.post('/api/auth/login', { data: { username, password: temporary } })).ok(),
    ).toBeTruthy();
    expect(
      (
        await admin.post('/api/auth/password', {
          data: { currentPassword: temporary, newPassword: password },
        })
      ).ok(),
    ).toBeTruthy();
  }
});
test.afterAll(async () => {
  await admin?.dispose();
});
async function account(projectId: string, roleId: string) {
  const user = 'setup_' + suffix(),
    pass = randomBytes(18).toString('base64url'),
    next = randomBytes(18).toString('base64url');
  const response = await admin.post('/api/admin/users', {
    data: {
      username: user,
      name: 'ผู้ดูแลทดสอบ',
      password: pass,
      isAdmin: false,
      memberships: [{ projectId, roleId }],
    },
  });
  expect(response.ok()).toBeTruthy();
  const api = await apiRequest.newContext({
    baseURL: 'http://localhost:4200',
    extraHTTPHeaders: headers,
  });
  try {
    expect(
      (await api.post('/api/auth/login', { data: { username: user, password: pass } })).ok(),
    ).toBeTruthy();
    expect(
      (
        await api.post('/api/auth/password', { data: { currentPassword: pass, newPassword: next } })
      ).ok(),
    ).toBeTruthy();
  } finally {
    await api.dispose();
  }
  return { username: user, password: next, id: (await response.json()).id };
}
async function seedProject() {
  const catalog = await (await admin.get('/api/admin/project-reference-data')).json();
  const response = await admin.post('/api/admin/project-setup', {
    data: {
      code: 'P-' + suffix(),
      name: 'Project test',
      clientId: catalog.clients[0].id,
      description: '',
      accent: 'violet',
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test('admin creates references and draft, saves each section, handles dirty changes and activates', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await page.getByRole('link', { name: 'จัดการระบบ', exact: true }).click();
  await page.getByRole('link', { name: 'โปรเจกต์', exact: true }).click();
  await page.getByRole('link', { name: 'ข้อมูลกลาง Client / คลัง' }).click();
  const warehouse = 'คลังทดสอบ ' + suffix();
  await page.getByLabel('รหัส คลังสินค้า', { exact: true }).fill('W-' + suffix());
  await page.getByLabel('ชื่อ คลังสินค้า', { exact: true }).fill(warehouse);
  await page.getByRole('button', { name: 'เพิ่มคลังสินค้า', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('เพิ่มข้อมูลกลาง');
  await page.getByRole('link', { name: 'จัดการโปรเจกต์' }).click();
  await page.getByRole('button', { name: 'สร้างโปรเจกต์', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'สร้างฉบับร่าง' }).click();
  await expect(dialog.getByLabel('Client *', { exact: true })).toBeFocused();
  await dialog.getByLabel('Client *', { exact: true }).selectOption({ index: 1 });
  await dialog.getByLabel('รหัสโปรเจกต์ *', { exact: true }).fill('UI-' + suffix());
  await dialog.getByLabel('ชื่อโปรเจกต์ *', { exact: true }).fill('โปรเจกต์ทดสอบหน้าจอ');
  await dialog.getByRole('button', { name: 'สร้างฉบับร่าง' }).click();
  await expect(page.getByRole('heading', { name: /โปรเจกต์ทดสอบหน้าจอ/ })).toBeVisible();
  const id = page.url().split('/projects/')[1].split('/')[0];
  await page.getByLabel('ชื่อโปรเจกต์ *', { exact: true }).fill('ข้อความยังไม่บันทึก');
  await page.getByRole('button', { name: 'คลังสินค้า', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('ชื่อโปรเจกต์ *', { exact: true })).toHaveValue(
    'ข้อความยังไม่บันทึก',
  );
  await page.getByRole('button', { name: 'คลังสินค้า', exact: true }).click();
  await page.getByRole('button', { name: 'ทิ้งการแก้ไข' }).click();
  await page.getByRole('checkbox', { name: 'ใช้คลัง ' + warehouse, exact: true }).check();
  await page.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).click();
  await expect(page.getByRole('status')).toContainText('บันทึกการตั้งค่า');
  await page.getByRole('button', { name: 'กฎของโปรเจกต์', exact: true }).click();
  await page.getByLabel('การควบคุม Lot', { exact: true }).selectOption('required');
  await page.getByRole('button', { name: 'สมาชิก', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกก่อนออก' }).click();
  await expect(page.getByRole('heading', { name: 'สมาชิก', exact: true })).toBeVisible();
  const users = await (await admin.get('/api/admin/users')).json();
  const adminUser = users.find((u: { username: string }) => u.username === username);
  await page.getByLabel('เลือกผู้ใช้ที่มีอยู่').selectOption(adminUser.id);
  await page.getByLabel('บทบาทที่จะเพิ่ม').selectOption('manager');
  await page.getByRole('button', { name: 'เพิ่มสมาชิก', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).click();
  await expect(page.getByRole('status')).toContainText('บันทึกการตั้งค่า');
  await page.getByRole('button', { name: 'เปิดใช้งานโปรเจกต์', exact: true }).click();
  await page.getByRole('button', { name: 'ยืนยันเปิดใช้งาน', exact: true }).click();
  await expect(page.locator('.setup-status')).toHaveText('เปิดใช้งาน');
  await page.getByRole('button', { name: 'ข้อมูลทั่วไป', exact: true }).click();
  await page.getByLabel('คำอธิบาย', { exact: true }).fill('ยังคงข้อความเมื่อเซิร์ฟเวอร์ขัดข้อง');
  await page.route('**/setup/general', (route) =>
    route.fulfill({ status: 503, json: { message: 'ทดสอบบันทึกไม่สำเร็จ' } }),
  );
  await page.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).click();
  await expect(page.getByRole('alert')).toContainText('ทดสอบบันทึกไม่สำเร็จ');
  await expect(page.getByLabel('คำอธิบาย', { exact: true })).toHaveValue(
    'ยังคงข้อความเมื่อเซิร์ฟเวอร์ขัดข้อง',
  );
  await page.unroute('**/setup/general');
  await page.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).click();
  await expect(page.getByRole('status')).toContainText('บันทึกการตั้งค่า');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/project-setup-general.png', fullPage: true });
  await page.getByLabel('ชื่อโปรเจกต์ *', { exact: true }).fill('แก้จากหน้าจอ');
  const current = await (await admin.get(`/api/projects/${id}/setup`)).json();
  expect(
    (
      await admin.patch(`/api/projects/${id}/setup/general`, {
        data: {
          version: current.project.version,
          name: 'แก้จากอีกหน้าจอ',
          description: '',
          accent: 'teal',
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).click();
  await expect(page.getByRole('alert')).toContainText('มีผู้อื่นแก้ไข');
  await expect(page.getByLabel('ชื่อโปรเจกต์ *', { exact: true })).toHaveValue('แก้จากหน้าจอ');
  await page.getByRole('button', { name: 'โหลดข้อมูลล่าสุด', exact: true }).click();
  await page.getByRole('button', { name: 'ทิ้งการแก้ไข' }).click();
  await expect(page.getByLabel('ชื่อโปรเจกต์ *', { exact: true })).toHaveValue('แก้จากอีกหน้าจอ');
  await page.getByRole('button', { name: 'ประวัติ', exact: true }).click();
  await expect(page.locator('.setup-history-entry')).not.toHaveCount(0);
  await page.screenshot({ path: 'test-results/project-setup-history.png', fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole('button', { name: 'คลังสินค้า', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/project-setup-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('manager uses own setup without admin access; other project roles and cross-project links are denied', async ({
  page,
}) => {
  const d = await seedProject(),
    user = await account(d.project.id, 'manager');
  await login(page, user.username, user.password);
  await page.getByRole('link', { name: 'ตั้งค่าโปรเจกต์ ' + d.project.name, exact: true }).click();
  await expect(page.getByLabel('Client *', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'เปิดใช้งานโปรเจกต์' })).toHaveCount(0);
  await page.getByLabel('ชื่อโปรเจกต์ *', { exact: true }).fill('Manager แก้ได้');
  await page.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).click();
  await expect(page.getByRole('status')).toContainText('บันทึกการตั้งค่า');
  await page.getByRole('button', { name: 'กฎของโปรเจกต์', exact: true }).click();
  await expect(page.getByLabel('การควบคุม Lot', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' })).toHaveCount(0);
  expect(
    (
      await page.request.patch(`/api/projects/${d.project.id}/setup/rules`, {
        headers,
        data: { version: 1, lot: 'off', expiry: 'off', inspection: false },
      })
    ).status(),
  ).toBe(403);
  await page.goto('/admin/projects');
  await expect(page).toHaveURL(/\/projects$/);
  await page.goto('/projects/squ/settings');
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  const operator = await account(d.project.id, 'operator');
  await login(page, operator.username, operator.password);
  await page.goto(`/projects/${d.project.id}/settings`);
  await expect(page).toHaveURL(/\/projects$/);
});
