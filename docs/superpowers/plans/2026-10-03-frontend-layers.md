# Frontend layer separation

Implements the owner's HANDOFF requirements alongside the approved backend refactor. Scope is Module 1 only; preserve API contracts, electric-violet UI, validation, pending/error states, routing and session behavior.

## Design

Keep feature-oriented folders. Separate dedicated models and API services for users, roles and projects. `core/auth` owns authentication API, session models/state and guards. Session state may coordinate authentication and project selection, but must not contain administration API calls. Keep HTTP mutation headers and error translation in `core/http`. Move account-aware topbar into `core/layout`; shared visual primitives remain independent of feature services. Extract substantial templates without changing markup. Local editor drafts stay in the component.

Alternatives considered: splitting only types leaves the catch-all service; a new global store adds dependencies and complexity without a current need. Focused services with the existing signals preserve behavior with explicit ownership.

## Tasks and checks

- [x] Baseline: run `wms.cmd run test:ci` (existing 16 tests).
- [x] Extract models: user/membership/create/update under `features/admin/users`, role/permissions under `features/admin/roles`, project/workspace under `features/projects`, session/login/password under `core/auth`. Update consumers to import models directly.
- [x] Extract `UsersService`, `RolesService`, `ProjectsService` and `AuthApiService`. Preserve URLs, verbs, request bodies, encoding and `X-WMS-Request: 1`; use HTTP testing to cover success/error and mutation contracts.
- [x] Narrow `SessionService` to restore/login/logout/password/session/project-selection state. Preserve restore coalescing, storage cleanup, pending finalization and failed logout behavior. Keep existing behavior assertions.
- [x] Update admin/workspace consumers, move topbar to core/layout, and extract admin/password/workspace/topbar templates. Preserve local state, bindings and navigation guards.
- [x] Run frontend suite/build, source-boundary checks and isolated real-API browser tests. Review architecture and security for both layers before publishing.

## Dependencies

SessionService -> AuthApiService, ProjectsService -> HttpClient. Admin -> UsersService, RolesService, ProjectsService; guards -> SessionService. Feature models never import service implementations. Backend endpoints remain unchanged, allowing independent verification.

## Review focus

Failed requests must release loading/saving state; logout failure retains session; restore coalesces and rejects stale project selection; encoded IDs and mutation headers remain intact; user editing preserves per-project memberships and Thai validation.

References checked: [Angular style guide](https://angular.dev/style-guide), [Nest modules](https://docs.nestjs.com/modules), [Nest guards](https://docs.nestjs.com/guards). Installed dependencies remain unchanged.
