# Module 1 Access Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans. Track completion below.

**Goal:** Replace demo authentication with testable PostgreSQL-backed accounts and project access.
**Architecture:** NestJS owns sessions and authorization; Angular consumes same-origin REST through a development proxy. PostgreSQL runs in a dedicated Compose service.
**Tech Stack:** Angular 22, Tailwind CSS, Node 24.21.0, NestJS, PostgreSQL.
**Spec:** `docs/superpowers/specs/2026-09-14-module1-access-design.md`

## Global constraints
- No edits to exp/; retain approved violet UI and project names Apo, Squ, Mdr.
- Secrets remain ignored; no public registration; no warehouse operations.
- API field names and routes use the shared spec verbatim.
- Each implementer owns only its assigned subtree. Coordinator owns infrastructure/docs and integration.

## Task 1: Backend
Files: new backend/package.json, tsconfig.json, src/{main,db,security}.ts, src/{auth,admin,projects}/*.controller.ts, migrations/001_module1.sql and test/access.test.ts. main.ts contains the Nest bootstrap and shared authorization service; route controllers are grouped by feature.
- [x] Write failing HTTP integration tests for login/logout, forced change, cross-project authorization, nonadmin denial, duplicate memberships, disable/reset revocation and admin lockout.
- [x] Implement the API contract with parameterized SQL, migrations and environment bootstrap.
- [x] Run tests against isolated PostgreSQL schema using TEST_DATABASE_URL; build TypeScript.
Commands from backend: `npm.cmd run build`, `npm.cmd test` (portable Node PATH).
DB env `DATABASE_URL`, optional `TEST_DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `PORT=3000`, `APP_ORIGIN=http://localhost:4200`, `NODE_ENV=development`. `.env` loaded by npm scripts using Node --env-file=../.env.
Bootstrap must never reset existing admin passwords on restart. Export testable createApp function, honor TEST_DATABASE_URL safely. Test schemas prefixed test_ and removed after tests, never truncate normal schema.

## Task 2: Angular
Files: frontend/src/app/core/session*, guards, features/{login,projects,workspace,admin,password}, shared/topbar, app routes/config, proxy config, tests.
- [x] Replace DemoSession with SessionService and real REST, async guards and startup restore.
- [x] Implement mandatory and voluntary password change, admin account forms and role-permission editor per spec.
- [x] Add meaningful service/guard tests, build and adapt E2E to API-backed workflow.
Interface: exact API types/endpoints in spec. Fetch or HttpClient same-origin /api, header X-WMS-Request: 1 on mutations. No passwords in localStorage/sessionStorage. Preserve skip-link behavior.
Commands root: `.\wms.cmd test:ci`, `.\wms.cmd run build`, `.\wms.cmd run test:e2e` with API and Angular running. Coordinator runs whole-system E2E and supplies ignored bootstrap credentials.

## Task 3: Local runtime and review (coordinator)
Files: compose.yaml, .env.example, scripts/setup-local.mjs, backend.cmd, README, docs/MODULE1-TEST.md, .gitignore.
- [x] Start dedicated PostgreSQL on loopback 5433, volume mounted /var/lib/postgresql (Postgres 18).
- [x] Generate cryptographic DB/admin passwords into ignored .env and local test instructions; no fixed defaults.
- [x] Integrate services, run backend and browser tests including mobile, inspect UI screenshots.
- [x] Review implementation, resolve material findings and update docs.

Integration choice: publish the verified change to origin/main per the user's existing GitHub authorization.

## Decisions and progress
- User authorized execution and later joint testing; no repeated design approval needed.
- Administrator is company-wide, project roles are membership-scoped; editable catalog currently only workspace.view.
- Tasks 1 and 2 share REST types only; both consume the spec. Task 3 supplies env/proxy targets to both. No conflicting file ownership.
- All tasks align with acceptance: backend enforces access; frontend presents state; coordinator verifies real integration.

## Verification results

- Backend: 11 PostgreSQL integration tests pass, including deterministic reset/change/login races and concurrent administrator authorization.
- Frontend: 15 service/guard/component tests pass, including edit-role values and failed logout.
- Edge: 8 end-to-end flows pass against a temporary PostgreSQL schema; desktop/mobile screenshots inspected and 360px overflow checks pass.
- Production builds pass for Angular and NestJS; runtime dependency audits report 0 vulnerabilities.
- Review findings (concurrent throttle reservations, credential revalidation and failed-logout handling) fixed and approved on re-review. Test fixture/order gaps fixed and re-reviewed.
- Local health check passes through the Angular proxy. Public database contains only the bootstrap Admin, still requiring first password change.
