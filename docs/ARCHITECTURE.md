# Module 1 architecture

Module 1 remains authentication, company administration and project access. This refactor does not add warehouse workflows or change the database schema, API routes or accepted UI.

## Backend

- `main.ts` bootstraps the server and retains the test-compatible `createApp` export. `app.ts` configures the `/api` prefix, mutation header/origin checks and application/database shutdown. `app.module.ts` assembles features.
- `auth`, `users`, `roles`, `projects` own their controllers, services, repositories and module wiring. Controllers handle HTTP and cookies; services receive typed values and own workflows/transactions; repositories own parameterized queries.
- DTO pipes normalize and validate HTTP inputs using the existing messages. Session/admin guards enforce route entry. Target/role guards preserve the original order of checks before body validation.
- `UsersDataModule` exports user persistence and `ProjectsDataModule` exports project access queries/services. Auth imports these without importing the guarded Users/Projects feature modules, avoiding circular dependencies. Only database infrastructure is global.
- Public response models are distinct from `UserRow`. Password hashes and raw tokens never enter serialized responses. Raw session tokens travel only to the controller's cookie helper.
- `health` owns the database-backed health endpoint. Schema migrations and first-admin bootstrap remain in `db.ts`; no ORM or dependency was added.

### Transaction and authentication invariants

The service opens each transaction and passes its same `PoolClient` to every participating repository. Login locks and rechecks the verified user's active status/hash before issuing a session. Password change locks the session and user, verifies the current credential, revokes old sessions and issues a replacement. Password reset locks the target before updating/revoking. User updates retain the advisory administrator lock, locked actor revalidation and last-active-administrator protection. Login throttle reservations remain synchronous before the first await.

Cookies retain their name, HttpOnly/SameSite/Secure/path/expiry behavior. A committed login/password change writes its cookie before loading projects, so a project-catalog failure does not discard the replacement credential. Regression tests cover this failure boundary.

## Frontend

- `core/auth`: authentication API, session models/state and route guards. `SessionService` coordinates restore/login/logout/password changes and selected-project state. It contains no administration HTTP operations.
- `features/admin/users`: user and membership models, create/update/reset request types, UsersService.
- `features/admin/roles`: role/permission models and RolesService.
- `features/projects`: project/workspace models and ProjectsService.
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

No migration or credential reset is required. Rebuild/restart the backend to load its new module wiring.

Framework references: [Nest modules](https://docs.nestjs.com/modules), [Nest guards](https://docs.nestjs.com/guards), [Angular style guide](https://angular.dev/style-guide).
