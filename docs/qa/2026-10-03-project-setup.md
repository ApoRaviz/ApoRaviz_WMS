# Project Setup — 2026-10-03

Branch: `feat/project-setup`; implementation starts at `61943c3`, based on `a181cff`.

## Scope and paths

- Admin: จัดการระบบ → โปรเจกต์ (`/admin/projects`), search/filter by Client/status, create draft.
- Client/Warehouse reference data: separate `/admin/project-reference-data` list/create page. Project form only selects existing records.
- Shared setup: `/projects/:projectId/settings`, five separately saved sections. Admin manages all fields; assigned Manager edits name/description/accent/default warehouse only. Other roles cannot enter.
- Rules are stored for future operational modules; no Inbound/stock mutation was added.

## Verification

- Backend build and 25/25 integration tests passed, including eleven Project Setup tests: draft/defaults, immutable and duplicate code, master data, shared warehouses, default validation, activation, role/project scope, concurrent version conflict, simulated first-use/stock locks, existing user editor audit, draft workspace denial, audit failure rollback and stale Users forms after Setup adds/changes memberships. A separate migration test upgrades a populated Module 1 schema twice and verifies unchanged accounts, memberships and project names with no fabricated warehouse links.
- Frontend 26/26 unit tests and production build passed. Layer-boundary check and `git diff --check` passed.
- Final Edge 11/11 flows passed: eight existing Login/project/user/password/logout flows and three Setup flows. Setup covers required-field feedback, create/activate, Manager restrictions, dirty Stay/Discard/Save, API 503 retaining edits and retry, API 409 retaining edits then latest-data reload, direct restricted routes, logout with an unsaved form, and stale Users form recovery.
- Isolated browser run used API 3002/UI 4202 and generated `test_browser_*` schemas. Existing services on 3000/4200 and real accounts were not changed. Standard `e2e.cmd` uses 3000/4200; do not run it while the user's API occupies port 3000.
- Inspected desktop (1440px) and mobile (360px) screenshots: readable sections, responsive forms, no horizontal document overflow. Native dialogs handle Escape and focus containment. Screenshots/trace files remain local under `frontend/test-results/`.
- Required-field test initially failed because Angular's default `novalidate` suppressed feedback; Project creation/reference forms now use native browser validation. Setup form also calls `reportValidity()` before a save.

## Migration and local testing

Backend startup applies `002_project_setup.sql` once, in a transaction. Rebuild/restart backend to load the new endpoints and migration; no reset or password change is needed.

From repository root:

```powershell
.\backend.cmd run build
.\backend.cmd start
```

Or from `backend/`, run `npm run build` then `npm start`. Frontend remains `npm start` in `frontend/` (or `.\wms.cmd start` from repository root).

Existing Project IDs, memberships, accounts and active status are retained. Client labels become linked central Client records. Physical warehouses are not fabricated: prepare them in the reference-data page, then select allowed/default warehouses and an active Manager. New Projects begin as drafts. Existing active Projects remain usable while being configured.

## Decisions and boundaries

- Kept the user's runnable checkout on a new feature branch, preserving their `frontend/angular.json` change.
- Added minimal separate Client/Warehouse preparation because those master tables did not exist. Editing/deactivating master data and Zone/Location management are outside this slice.
- Future transaction writers must set `projects.first_transaction_at` and maintain `project_warehouses.has_stock/has_open_work` atomically with their stock/work transactions and compatible locking. These are internal safeguards exercised by tests, not proof of an implemented inventory integration.
- The shared administrative lock serializes settings/membership mutations across both editors; each successful Project write updates version and audit in the same transaction.
- This round retains the local feature branch for owner testing. No merge or remote push is part of this delivery.

## Whole-branch review

Independent reviewer checked `a181cff..61943c3` read-only: no Critical findings; two Important findings reproduced and fixed in one pass.

1. A stale Users editor could replace newer Project memberships. Regression tests reproduced HTTP 200 instead of 409 for both a changed role and a newly added membership. The Users PATCH now requires `expectedMemberships`, copied from the last read and compared to current assignments under the same transaction lock. Mismatches return 409 without changing data/audit. The UI retains edits and offers explicit discard/reload. API consumers must now send this baseline with user updates; old pages should be refreshed after deployment.
2. Dirty Setup logout revoked the session before the save/discard choice. The browser test reproduced 401 while the leave dialog was open. Topbar now invokes an optional page-owned confirmation before logout; Setup completes any selected save and refresh before proceeding. Stay preserves the session.

Final verification after fixes: backend 25/25, frontend 26/26, Edge 11/11, both builds and source boundaries pass. Each Important finding has a regression that failed before the fix and passed afterward. The audit failure test deliberately emits one simulated server error while proving rollback; this is expected test output.

Deferred minor: Manager History may show an old Client/removed Warehouse ID instead of its readable name because the selectable catalog is restricted to current references. The stored history remains intact; a future improvement should resolve historical labels separately from selectable options.

Review rulings: retain the approved activation-only active-Manager requirement (later membership removal is allowed); actual inventory writers and full reference-data editing remain explicitly out of scope. Keep the current runnable feature branch for owner testing, as requested, rather than adding an integration approval step.
