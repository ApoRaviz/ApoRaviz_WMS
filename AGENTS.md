# Project engineering rules

## Owner requirement: architecture is mandatory

The owner requires clear, maintainable structure following established Angular and NestJS practices. MVP reduces feature scope, not engineering quality. Apply these rules to new code and code being refactored; existing violations are not precedents to copy.

Read `docs/HANDOFF.md` before resuming work. Respect the owner's current pause; recording rules does not authorize resuming implementation.

## Backend

- Organize by feature/domain (Auth, Users, Roles, Projects), with explicit module imports and exports.
- Controllers handle routing, HTTP input/output and cookies, delegating use cases to focused services. No SQL or business workflows in controllers.
- Services own business rules and transaction boundaries. Do not pass Express Request/Response into business services or attach route decorators to them.
- Repositories own parameterized queries and persistence mapping. Operations in a transaction must share its database client; preserve locking and authorization revalidation.
- Define typed DTOs and validate untrusted input at the API boundary. Keep persistence entities, public response models and request DTOs distinct where their contracts differ. Never expose password hashes or session tokens in public models.
- Use guards for authentication/authorization entry checks. Enforce project scope and relevant business permissions on the server; retain transactional checks when state can change concurrently.
- Keep bootstrap/configuration in main/app wiring. No catch-all AccessService, controller, utility file or service that contains unrelated features.

## Frontend

- Organize by feature. Keep shared code limited to reusable UI and cross-feature infrastructure.
- Components own presentation, user interaction and local form/UI state. Delegate HTTP and reusable business workflows to focused services.
- Separate API access, session/shared state and feature responsibilities as needed; do not replace one large component with one large service.
- Define models and API request/response types in dedicated files near their owning feature. Avoid duplicate definitions and imports of domain types from service implementations.
- Guards own route access checks, not server authorization. Shared UI must not depend on feature-specific business logic.
- Keep substantial templates/styles in their appropriate files. Small inline templates are acceptable when they remain easy to understand.

## Dependency and code quality

- Keep responsibilities explicit and dependencies one-way. Avoid circular imports, cross-layer shortcuts, unbounded files and unrelated logic grouped by convenience.
- Use strict typing. Prefer unknown plus validation over any. Handle loading, success, failure, cancellation and retry where applicable.
- Prefer the simplest structure that respects these boundaries. Do not add generic base repositories, factories, interfaces, global stores or extra libraries without a concrete need.
- Follow the project's chosen stack. Verify version-dependent framework guidance against installed versions and official documentation before adopting it.
- Refactoring preserves API contracts, data, security invariants and accepted UX unless the owner requests a behavior change. Protect secrets and user-owned changes.

## Required completion checks

- Review architecture as well as behavior: file responsibilities, dependency direction, DTO/model placement, SQL ownership, component/service separation and maintainability.
- Run checks appropriate to the changed layers: type/build checks, meaningful unit/integration tests and browser flows. Add regression coverage for reproduced bugs; never weaken tests just to pass a refactor.
- Check authorization, transaction/locking behavior, session revocation and error handling when those paths change.
- Tests passing alone does not establish architectural quality. Resolve material structural violations within the changed scope before calling work complete; report remaining limitations honestly.
- Deliver changes with their purpose, verification evidence and any relevant migration/operational notes. Continue module-by-module, with owner testing before the next module.
