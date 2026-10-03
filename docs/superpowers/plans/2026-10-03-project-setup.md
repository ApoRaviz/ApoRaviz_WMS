# Project Setup implementation

User approved the complete in-chat design and explicitly requested implementation on 2026-10-03. This plan preserves that design; no additional approval gate is pending.

## Contract

Independent Project Setup, no Inbound integration. Admin creates drafts, manages status, clients/allowed warehouses/rules/members. Project Manager edits name/description/accent/default warehouse and reads own setup/history. Other project roles cannot access setup. Shared warehouses are many-to-many with exactly one default when activating. Activation requires an active Manager. Code is immutable. Lot/expiry modes off/item/required; inspection defaults true. Lock client/rules after first transaction. Audit every successful write atomically; optimistic version prevents lost updates.

UI: Admin project list with search/client/status filters and creation; shared full-page editor with General/Warehouses/Rules/Members/History. Per-section saves, three-way unsaved-change decision, clear form errors and conflict reload. Existing user management and project membership editor share the same memberships.

## Tasks

1. Database/API: additive migration, normalized clients/warehouses, project metadata/settings/links/audit/usage seam; typed DTO pipes and focused controller/service/repository. Isolated integration tests first covering authorization, draft lifecycle, validation, sharing, audit, stale writes and future usage locks.
2. Cross-feature consistency: existing project/session reads retain compatibility and expose status/setup ability; existing user membership writes record project audit/version. Prepare minimal separate Client/Warehouse master-data management, no inline creation in project forms.
3. Angular: typed models/API service, authorized routes, Admin list and master-data page, section components and shared setup page; dirty navigation, failures/conflict recovery and responsive styling. No giant Admin component extension.
4. Verify: unit/build/boundary checks, real API/Edge isolated flows plus original Module1 regression; visual desktop/mobile review; independent whole-branch review, fixes, handoff and local commits. No push without explicit approval after previous auto-review rejection.

## Implementation decisions

- Existing projects retain IDs/memberships/active behavior. Backfill Client references from existing labels; do not fabricate warehouse links or change real accounts.
- No inventory module exists. Internal project usage state records firstTransactionAt and per-warehouse hasStock/hasOpenWork for future transactional writers; no public API can set these flags. Tests exercise the safeguards directly. Actual stock writers must maintain them when implemented.
- Central Client/Warehouse data currently does not exist. Add minimal separate Admin list/create screens (code/name), not full master-data modules. No invented physical warehouses seeded into the real DB.
- Existing shared administrative advisory lock serializes setup/user membership changes before row locks, so version and audit remain consistent across both entry points. Read authorization is checked against current DB roles, not a cached client role.
- Work on feat/project-setup in the user's existing runnable checkout; preserve frontend/angular.json. Prior hover fix is committed separately as a181cff.

## Acceptance

Admin/Manager boundaries hold via API; shared warehouses and default constraints; immutable code and duplicate rejection; activation preconditions; first-use locks; audited section writes with rollback; concurrent version conflict; consistent memberships through both screens; dirty-form choices and failed save retention; no regression to Login/password/users/projects. New master data and setting changes persist in PostgreSQL.
