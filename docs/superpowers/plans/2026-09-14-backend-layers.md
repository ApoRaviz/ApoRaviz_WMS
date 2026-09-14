# Backend layer separation

User requested a maintainable Nest backend after identifying the monolithic implementation. Refactor Module 1 without changing routes, schemas, credentials or frontend behavior.

## Design and constraints

- main.ts only starts the server and re-exports createApp for existing tests. app.module.ts wires feature modules; app.ts configures the application lifecycle.
- Feature folders auth/, users/, roles/, projects/: thin controllers handle HTTP, services handle business workflows, repositories own parameterized SQL. Preserve /api/auth/*, /api/admin/users*, /api/admin/roles*, /api/admin/projects and /api/projects/:id/workspace exactly.
- Auth cookie parsing/writing stays in HTTP boundary helpers/controllers; services never receive Express Request/Response. Authenticated principal/session token data passed as typed values. Session and administrator guards enforce authentication, forced-password gating and admin scope. Keep fresh locked checks in mutations even after guard approval.
- Typed DTOs and Nest pipes validate unknown HTTP bodies with the same existing error messages/status codes and normalization. Do not introduce an ORM or validation framework solely for this refactor; use focused typed validation pipes. No route decorators in services, no any/AccessService imports from main.
- Services control transaction boundaries via existing Database.transaction. Repository methods accept PoolClient when joining a transaction; every query in one operation must use the same client. Preserve synchronous throttle reservations, row locks, advisory admin lock, credential/session revalidation, session revocation, and deterministic concurrency tests.
- Shared domain types in common/; Database connection/lifecycle provider separate. Schema migration/bootstrap SQL may remain with database infrastructure. Avoid generic base services/repositories, unnecessary interfaces or circular module imports.
- Keep createApp({testing:true}) and Database test imports compatible; existing SQL schema/migration and all11 HTTP tests remain acceptance baseline. Do not rewrite tests to weaken status/error/race expectations.
- No frontend edits; existing local frontend/angular.json change belongs to user.

## Work plan

1. Baseline: run existing11 backend tests; inspect API shapes and locks.
2. Extract domain types, HTTP cookie helpers and typed DTO validation.
3. Extract focused repositories with SQL/transaction client handling; services implement existing behavior on typed inputs.
4. Wire feature modules, guards/controllers and small bootstrap. Run baseline tests and build.
5. Coordinator adds/executes source boundary checks, runs browser CRUD/auth against isolated schema, reviews security invariants and documents structure.
6. Publish approved verified refactor under existing GitHub authorization, preserve local database and running user preview.

## Verification

No Express request/response imports or route decorators in services; no SQL or database injection in controllers/services (Database.transaction injection allowed in services); no monolithic AccessService; controllers do not import main. Existing11 integration tests plus browser auth/create/edit/role/reset behavior pass. Build succeeds and no secrets enter Git.
