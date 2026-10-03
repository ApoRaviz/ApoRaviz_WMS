# WMS architecture

Module 1 provides authentication, company administration and project access. Project Setup adds versioned configuration and shared warehouse references; operational warehouse workflows remain separate.

## Backend

- `main.ts` bootstraps the server and retains the test-compatible `createApp` export. `app.ts` configures the `/api` prefix, mutation header/origin checks and application/database shutdown. `app.module.ts` assembles features.
- `auth`, `users`, `roles`, `projects` own their controllers, services, repositories and module wiring. Controllers handle HTTP and cookies; services receive typed values and own workflows/transactions; repositories own parameterized queries.
- DTO pipes normalize and validate HTTP inputs using the existing messages. Session/admin guards enforce route entry. Target/role guards preserve the original order of checks before body validation.
- `UsersDataModule` exports user persistence and `ProjectsDataModule` exports project access queries/services. Auth imports these without importing the guarded Users/Projects feature modules, avoiding circular dependencies. Only database infrastructure is global.
- Public response models are distinct from `UserRow`. Password hashes and raw tokens never enter serialized responses. Raw session tokens travel only to the controller's cookie helper.
- `health` owns the database-backed health endpoint. Schema migrations and first-admin bootstrap remain in `db.ts`; no ORM or dependency was added.
- `projects/setup` owns the Setup controller, typed DTOs, business service and repositories. `ReferenceService` prepares central Clients/Warehouses. `MembershipAuditService` is exported through `ProjectsDataModule` so the existing Users editor records the same Project audit/version inside its transaction.
- Setup revalidates the actor and project role within the transaction, acquires the shared administrative advisory lock before row locks, checks the submitted version, and commits the section change with before/after audit and real actor identity. Client/rules lock after first use; internal usage flags protect warehouse removal/status changes until operational modules provide transaction writers.

### Entity identity and relational storage

Users, Projects, Clients and Warehouses use database-generated bigint identity primary keys. Their ten entity foreign keys use bigint, with indexes for both composite-link directions and reference/revocation queries. Each entity retains a unique text `public_id`: existing IDs remain unchanged and new ones are generated as UUIDv7 by PostgreSQL 18. Business codes remain separate. Role/permission natural keys and session token hashes are unchanged.

Repositories accept public IDs, resolve numeric keys within SQL, join on numeric columns and explicitly project `public_id AS id` into API-facing models. Any internal bigint returned by PostgreSQL remains a string; never convert it to JavaScript Number. Audit snapshots keep public identifiers, while audit relational columns use bigint. This adds a public-ID lookup index but reduces repeated key width in relations without breaking API URLs, sessions or memberships.

Migration 003 backfills and validates references, recreates constraints/indexes and commits with its migration marker. Unexpected dependencies or its five-second lock timeout roll back the upgrade. It requires coordinated maintenance because old binaries are incompatible with the new columns. See the [backup, restore, deployment and rollback runbook](qa/2026-10-03-internal-bigint-ids.md). Existing-schema concurrent upgrade is tested; initialize a brand-new database with one instance.

### Transaction and authentication behavior

The service opens each transaction and passes its same `PoolClient` to every participating repository. Login locks and rechecks the verified user's active status/hash before issuing a session. Password change locks the session and user, verifies the current credential, revokes old sessions and issues a replacement. Password reset locks the target before updating/revoking. User updates retain the advisory administrator lock, locked actor revalidation and last-active-administrator protection. Login throttle reservations remain synchronous before the first await.

User PATCH requires `expectedMemberships` from the original read; it is compared against the complete current assignment set before replacement. This detects both changed roles and assignments newly added through Project Setup. Setup performs its own project version check. Both editors preserve drafts on conflicts and require latest-data reload before retrying changes.

Cookies retain their name, HttpOnly/SameSite/Secure/path/expiry behavior. A committed login/password change writes its cookie before loading projects, so a project-catalog failure does not discard the replacement credential. Regression tests cover this failure boundary.

## Frontend

- `core/auth`: authentication API, session models/state and route guards. `SessionService` coordinates restore/login/logout/password changes and selected-project state. It contains no administration HTTP operations.
- `features/admin/users`: user and membership models, create/update/reset request types, UsersService.
- `features/admin/roles`: role/permission models and RolesService.
- `features/projects`: project/workspace models and ProjectsService.
- `features/project-setup`: typed Setup API/model, Admin list/reference page, project-scoped guard, full-page editor and focused section components. The page owns form/dirty/dialog state; HTTP stays in `SetupApi`. Backend checks all permissions independently. A Manager can enter own Setup without entering global Admin.
- `core/http`: mutation headers and Thai API error translation.
- `core/layout`: account-aware topbar. `shared` contains reusable brand/icon presentation only.
- Components retain local form/editing/loading state and presentation. Substantial templates live in adjacent HTML files. Models are imported from dedicated files rather than service implementations.

The existing restore coalescing, storage cleanup, pending/error behavior, failed-logout handling, username validation, password visibility controls and electric-violet markup are retained. Backend remains the authority for permissions.

## Verification

```powershell
.\backend.cmd test
.\backend.cmd run build
.\wms.cmd run test:ci
.\wms.cmd run build
.\.tools\node-v24.21.0-win-x64\node.exe scripts/check-layers.mjs --frontend
.\e2e.cmd
```

The source-boundary script detects common layer violations; it supplements architectural review and does not prove all dependency rules. Backend tests use temporary schemas. Browser tests require Angular on localhost:4200 and an unused API port 3000, and create/clean an isolated schema with ephemeral accounts. Never stop a user's running API just to run browser tests.

Migration 002 adds Project Setup and backfills central Client references. Migration 003 converts internal keys while preserving public identities and credentials. Before restarting this release against an existing database, stop old writers and verify a backup/restore using the [current migration runbook](qa/2026-10-03-internal-bigint-ids.md). New Projects are drafts; existing Projects remain active. See [Project Setup QA](qa/2026-10-03-project-setup.md) for feature behavior.

Framework references: [Nest modules](https://docs.nestjs.com/modules), [Nest guards](https://docs.nestjs.com/guards), [Angular style guide](https://angular.dev/style-guide).
