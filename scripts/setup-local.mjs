import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  console.log('.env already exists; existing credentials preserved.');
} else {
  const dbPassword = randomBytes(24).toString('base64url');
  const adminPassword = randomBytes(18).toString('base64url');
  const databaseUrl = `postgresql://wms:${dbPassword}@127.0.0.1:5433/wms`;
  writeFileSync(envPath, [
    `POSTGRES_PASSWORD=${dbPassword}`,
    `DATABASE_URL=${databaseUrl}`,
    `TEST_DATABASE_URL=${databaseUrl}`,
    'ADMIN_USERNAME=admin',
    'ADMIN_NAME="WMS Administrator"',
    `ADMIN_PASSWORD=${adminPassword}`,
    'APP_ORIGIN=http://localhost:4200',
    'PORT=3000',
    'NODE_ENV=development',
    '',
  ].join('\n'), { flag: 'wx', mode: 0o600 });
  mkdirSync(resolve(root, '.local'), { recursive: true });
  writeFileSync(resolve(root, '.local/first-login.md'), [
    '# Local WMS first login',
    '',
    'Open http://localhost:4200',
    'Username: admin',
    `Temporary password: ${adminPassword}`,
    '',
    'Change this password at first login. This file is ignored by Git.',
    'The temporary password stops working after you change it.',
    '',
  ].join('\n'), { flag: 'wx', mode: 0o600 });
  console.log('Created ignored .env and .local/first-login.md. No passwords printed.');
}
