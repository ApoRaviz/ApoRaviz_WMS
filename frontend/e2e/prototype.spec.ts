import { expect, test } from '@playwright/test';

test('login validation, project search and switch, logout and guarded deep links', async ({ page }) => {
  await page.goto('/workspace');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page.getByText('กรุณากรอกชื่อผู้ใช้', { exact: true })).toBeVisible();
  await page.getByLabel('ชื่อผู้ใช้', { exact: true }).fill('demo');
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('demo123');
  await page.getByRole('button', { name: 'แสดงรหัสผ่าน', exact: true }).click();
  await expect(page.getByLabel('รหัสผ่าน', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('button', { name: 'เข้าโปรเจกต์ Apo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'เข้าโปรเจกต์ Squ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'เข้าโปรเจกต์ Mdr' })).toBeVisible();
  await page.getByLabel('ค้นหาโปรเจกต์').fill('sQU');
  await expect(page.getByRole('button', { name: 'เข้าโปรเจกต์ Squ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'เข้าโปรเจกต์ Apo' })).toHaveCount(0);
  await page.getByLabel('ค้นหาโปรเจกต์').fill('missing');
  await expect(page.getByRole('heading', { name: 'ไม่พบโปรเจกต์' })).toBeVisible();
  await page.getByRole('button', { name: 'ล้างการค้นหา' }).click();
  await page.getByRole('button', { name: 'เข้าโปรเจกต์ Apo' }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole('heading', { name: 'พื้นที่ทำงาน Apo' })).toBeVisible();
  await page.getByRole('button', { name: 'เปลี่ยนโปรเจกต์', exact: true }).click();
  await page.getByRole('button', { name: 'เข้าโปรเจกต์ Mdr' }).click();
  await expect(page.getByRole('heading', { name: 'พื้นที่ทำงาน Mdr' })).toBeVisible();
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login$/);
});

test('empty assignment account gives an actionable empty state', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('ชื่อผู้ใช้', { exact: true }).fill('empty');
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('demo123');
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ยังไม่มีโปรเจกต์ที่ได้รับสิทธิ์' })).toBeVisible();
  await expect(page.getByRole('button', { name: /เข้าโปรเจกต์ / })).toHaveCount(0);
});

test('keyboard skip link preserves project session and moves focus to main', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'กรอกบัญชีสาธิต' }).click();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole('link', { name: 'ข้ามไปเนื้อหาหลัก' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.getByRole('button', { name: 'เข้าโปรเจกต์ Apo' })).toBeVisible();
});

test('handheld flow has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'ยินดีต้อนรับกลับ' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/login-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'กรอกบัญชีสาธิต' }).click();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'เข้าโปรเจกต์ Mdr' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/projects-mobile.png', fullPage: true });
});

test('desktop review screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'ยินดีต้อนรับกลับ' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/login-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'กรอกบัญชีสาธิต' }).click();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'เลือกโปรเจกต์ของคุณ' })).toBeVisible();
  await page.screenshot({ path: 'test-results/projects-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'เข้าโปรเจกต์ Apo' }).click();
  await expect(page.getByRole('heading', { name: 'พื้นที่ทำงาน Apo' })).toBeVisible();
  await page.screenshot({ path: 'test-results/workspace-desktop.png', fullPage: true });
});
