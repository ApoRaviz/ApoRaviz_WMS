import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.loadEnvFile(resolve(root, '.env'));
const requireBackend = createRequire(resolve(root, 'backend/package.json'));
const { Pool } = requireBackend('pg');
const schema = `test_browser_${randomBytes(8).toString('hex')}`;
const temporaryPassword = randomBytes(18).toString('base64url');
const password = randomBytes(18).toString('base64url');
try {
  await fetch('http://127.0.0.1:3000/api/health', { signal: AbortSignal.timeout(1000) });
  throw new Error('Port 3000 already serves an API. Stop it before running isolated browser tests.');
} catch (error) {
  if (error.message.includes('already serves')) throw error;
}
const env = {
  ...process.env,
  DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  DATABASE_SCHEMA: schema,
  ADMIN_USERNAME: 'e2e_admin',
  ADMIN_NAME: 'ผู้ดูแลทดสอบ',
  ADMIN_PASSWORD: temporaryPassword,
  APP_ORIGIN: 'http://localhost:4200',
  PORT: '3000',
  E2E_ADMIN_USERNAME: 'e2e_admin',
  E2E_ADMIN_TEMP_PASSWORD: temporaryPassword,
  E2E_ADMIN_PASSWORD: password,
};
let server;
let serverExit;
try {
  server = spawn(process.execPath, ['dist/main.js'], { cwd: resolve(root, 'backend'), env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', () => {});
  server.stderr.on('data', data => process.stderr.write(data));
  serverExit = new Promise(resolveExit => server.once('exit', resolveExit));
  server.on('error', error => { console.error(error.message); });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(`Test API exited (${server.exitCode}).`);
    try {
      const response = await fetch('http://127.0.0.1:3000/api/health');
      if (response.ok) { ready = true; break; }
    } catch {}
    await delay(500);
  }
  if (!ready) throw new Error('Test API did not become healthy.');
  console.log(`Browser tests use isolated schema ${schema}. Angular must run on localhost:4200.`);
  const runner = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
    cwd: resolve(root, 'frontend'), env, stdio: 'inherit',
  });
  process.exitCode = await new Promise((resolveExit, reject) => {
    runner.once('error', reject);
    runner.once('exit', code => resolveExit(code ?? 1));
  });
} finally {
  if (server && server.exitCode === null) { server.kill(); await serverExit; }
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    // This exact schema name is generated above, never read from user input.
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally { await pool.end(); }
}
