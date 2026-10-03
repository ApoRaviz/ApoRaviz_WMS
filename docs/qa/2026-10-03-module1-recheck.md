# Module 1 recheck before Inbound design

ตรวจ commit `d9ba964` วันที่ 2026-10-03 ตามคำสั่งตรวจ Login และการทำงานก่อนเริ่มออกแบบ Inbound

| Check | Result |
|---|---|
| Backend integration + committed-cookie failure tests | 13/13 passed |
| Frontend unit/component/guard/API tests | 22/22 passed |
| Backend TypeScript build | Passed |
| Frontend production build | Passed |
| Source-boundary checks | Passed |
| Edge browser flows with real API/Postgres | 8/8 passed, 17.9s |
| Login visual review | Desktop 1440px and mobile 360px reviewed; labels, password toggle and submit visible, no page overflow |

Browser coverage: empty/invalid login, password visibility, correct login, per-project roles, permission denial, reload, project switch, logout, no-assignment state, keyboard skip link, disable-session revocation, forced password change, mobile width, admin create/edit/role permissions, password reset, logout failure/retry.

The user's active app on ports 3000/4200 was preserved. A local-only copy of the existing test runner/spec/config targeted API 3002 and UI 4202 with ephemeral accounts in `test_browser_*`; the runner cleaned its temporary schema. Test assertions were unchanged. The first attempt to start another UI on 4200 was refused because the port was already in use; no process was stopped.

Screenshots were produced in ignored `frontend/test-results/`. No real credentials or customer data are included. No source defect was reproduced; the previously reported spinner remains unconfirmed, though create/edit flows pass.
