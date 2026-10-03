# Inbound Angular Mock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the reviewed Inbound workflow into the authenticated Angular workspace using clearly labelled, memory-only fixtures.

**Architecture:** Components own forms and presentation; an Inbound service owns commands and validation; a project-scoped mock repository owns fixture state. Existing session/workspace APIs authorize workspace access. Inbound writes remain local mock operations.

**Tech Stack:** Existing Angular standalone components, signals, TypeScript, Vitest and Playwright/Edge; no new dependency or database migration.

**Spec:** [Inbound design](../specs/2026-10-03-inbound-mock-design.md)

**Status:** Future implementation plan, not executed in this design round. The interactive reference is [the standalone prototype](../../prototypes/inbound/README.md). Assumptions are documented for later owner review; the user authorized design without waiting for answers.

## Global Constraints

- Retain electric-violet, Noto Sans Thai/Manrope, existing auth and password-change behavior.
- Quantity is a positive safe integer in PCS; no over-receipt, decimal conversion or serial capture.
- Lot/expiry/inspection behavior comes from project configuration; date baseline in fixtures is `2026-10-03`.
- Receiving → Inspection (optional) → Putaway; partial receipts can progress independently.
- Rejected quantities never enter normal putaway. No short-close or quarantine disposition in this scope.
- Show “ข้อมูลตัวอย่าง · รีเฟรชแล้วคืนค่าเริ่มต้น”; no Inbound HTTP writes, stock posting or localStorage persistence.
- Mock roles demonstrate UI policy only; production granular permissions require separate server implementation.
- Keep the user's existing `frontend/angular.json` analytics change out of commits.

## Review Focus

- Project changes while a command is pending must never apply it to the newly selected project (Tasks 1 and 3).
- Repeated receipts using the same SKU/lot remain distinguishable by batch ID (Tasks 1 and 3).
- A forbidden deep link must not show fixtures before server workspace validation completes (Task 2).
- Same command ID with changed payload fails, while a retry with identical payload has no extra effect (Task 1).
- Keyboard-only handheld use retains focus, visible errors, activity history and 44px actions (Tasks 3 and 4).

## File map

Paths below are under `frontend/src/app/` unless specified. Each component gets sibling `.html`, `.css` and `.spec.ts` files when needed; avoid adding empty scaffolding.

| Files | Responsibility |
|---|---|
| `features/inbound/models/inbound.model.ts` | Config, plan/line/batch, status and typed command/result contracts |
| `features/inbound/data/inbound.fixtures.ts` | Fictional seed templates; remap to authorized real project IDs explicitly |
| `features/inbound/data/inbound-mock.repository.ts` | Private in-memory records, scoped reads and reset |
| `features/inbound/services/inbound-policy.ts` | Pure totals/status and mock role policy |
| `features/inbound/services/inbound.service.ts` | Validated commands, replay detection and activity |
| `features/inbound/inbound-workspace.guard.ts` | Await existing `SessionService.openWorkspace(projectId)` before rendering |
| `features/inbound/pages/inbound-list.ts`, `inbound-detail.ts`, `receive-plan-editor.ts` | Queue, detail orchestration and multi-line draft editor |
| `features/inbound/components/receiving-form.ts`, `inspection-form.ts`, `putaway-form.ts`, `inbound-status.ts` | Focused form/presentation units |
| `app.routes.ts`, `features/workspace/workspace.html`, `workspace.ts` | Lazy routes and Inbound navigation from the existing workspace |
| `frontend/e2e/inbound.spec.ts` | Browser acceptance using isolated accounts/schema |

## Task 1: Typed mock workflow

**Files:** Create the models, data and services above, plus `inbound.service.spec.ts` and `inbound-policy.spec.ts` alongside their implementations.

**Interfaces:** `InboundPlan` has projectId/id/lines/batches/activity; `ReceiptBatch` retains id/lineId/qty/lot/expiry/receivedAt/accepted/rejected/putaway/placements. Define `CreatePlanInput` with `lines: { itemId: string; expected: number }[]`. Define discriminated `InboundCommand` for receive/inspect/putaway with projectId/planId/commandId and the corresponding prototype fields. `InboundCommandResult = { plan: InboundPlan; replayed: boolean }`.

`InboundService.list(projectId: string): InboundPlan[]`, `get(projectId: string, planId: string): InboundPlan`, `create(input: CreatePlanInput, role: MockRole): InboundPlan`, `release(projectId: string, planId: string, role: MockRole): InboundPlan`, `execute(command: InboundCommand, role: MockRole): InboundCommandResult`, `reset(): void`. Reads return copies; component code cannot mutate repository state. Keep command execution synchronous in this mock; any simulated delay belongs to the presentation controller and is cancelled before execution if context changes.

- [ ] Write failing tests: receive 90 of 180 then inspect/putaway that batch while the document remains RECEIVING; receive/inspect/putaway the remainder and other line to reach COMPLETED. Assert physical receipt total never increases on putaway.
- [ ] Add tests: reject zero/negative/fractional/over-limit quantities, invalid ISO date, expired input, missing controlled lot, mismatched project/item/supplier/warehouse; accepted+rejected must equal batch qty and rejection needs a reason. Draft cannot receive.
- [ ] Add tests: same command/payload replays once; changed payload conflicts; two SKUs or two receipts sharing a lot have distinct batch IDs in activity and choices; rejected 20 of 200 remains ON_HOLD after storing 180. Customer cannot write; Operator cannot inspect/create.
- [ ] Run `./wms.cmd run test:ci`; confirm failures identify the missing workflow.
- [ ] Implement these contracts using the prototype's rules and fixtures; extend create to multiple unique SKU lines. Do not introduce a generic store or HTTP adapter yet.
- [ ] Run `./wms.cmd run test:ci`; require all existing and new tests to pass. Commit these feature files only: `feat: add typed inbound mock workflow`.

## Task 2: Authorized navigation and queue

**Files:** Create guard/list/status components and their tests; modify the existing routes and workspace navigation.

**Interfaces:** `requireInboundWorkspace: CanActivateFn` first awaits the existing session/password guard, then `openWorkspace(projectId)`. Forbidden projects redirect to `/projects` with an appropriate message; render no fixture content while pending. List consumes Task 1's `list()` and policy functions; links carry projectId and planId.

- [ ] Write failing guard/component tests for no session, forced password change, inaccessible deep link, failed authorization/retry and project switching. Assert no local mock list is read before successful authorization.
- [ ] Write queue tests for search by number/reference/supplier/SKU, status/warehouse filter, empty result, empty project and summary document counts. ON_HOLD must not count as waiting inspection.
- [ ] Run `./wms.cmd run test:ci` and observe expected new failures.
- [ ] Add lazy `/workspace/:projectId/inbound` and `/workspace/:projectId/inbound/:planId` routes guarded as above. Keep `/workspace/:projectId` functional. Unknown authorized projects receive empty fixtures/config defaults; do not infer configuration from a project display name. Assign the demo template explicitly and label it.
- [ ] Implement the queue using the prototype's layout and existing topbar; expose mock controls separately. Clear pending presentation work on project/role/reset/navigation changes.
- [ ] Run `./wms.cmd run test:ci` and `./wms.cmd run build`; commit `feat: add inbound mock navigation and queue` after both pass.

## Task 3: Drafts and receiving operations

**Files:** Create editor/detail/form components and tests from the file map.

**Interfaces:** Forms accept the current plan/config and emit typed command input without commandId. The detail controller generates one ID per intentional submit and reuses it for retry; calls Task 1's `execute`. Form loading/error/focus stay local. The editor emits `CreatePlanInput`; duplicate SKU lines are rejected.

- [ ] Write failing tests for multi-line draft creation/release, required controls by config, barcode selecting without incrementing, unknown/already-complete barcode feedback, and submit locking.
- [ ] Add tests: reset/navigation/role change during a simulated delay cancels that pending local operation; no stale result replaces the new document. Browser-side cancellation must not be documented as cancelling a future server transaction.
- [ ] Add inspection/putaway tests: partial batch workflow, same-lot distinct batch labels, no inspection config, available quantity limits, wrong warehouse, quarantine exclusion and visible mobile activity.
- [ ] Run `./wms.cmd run test:ci`; confirm the intended new failures.
- [ ] Implement editor and three action forms with inline errors, labelled fields, keyboard focus and 44px actions. Render multi-SKU detail totals per line, activity SKU/batch/lot/location and pending/empty/read-only panels. Reuse existing icons/styles without changing unrelated pages.
- [ ] Run `./wms.cmd run test:ci` and `./wms.cmd run build`; commit `feat: add inbound draft and receipt mock screens`.

## Task 4: Browser acceptance and handoff

**Files:** Create `frontend/e2e/inbound.spec.ts`; update QA evidence and `docs/HANDOFF.md`.

**Interfaces:** Use the existing isolated test account/schema lifecycle and actual workspace authorization. Inbound mutations must stay entirely in the mock service.

- [ ] Add failing browser scenarios for login→project→Inbound, multi-line draft→receive→inspect→putaway, rejection/quarantine, role restrictions, project change, refresh reset, duplicate retry and error/retry.
- [ ] Assert no Inbound mutation HTTP calls; test widths 360/768/1024/1440, no page overflow, dialog keyboard cancel, visible focus and accessible errors. Verify same-lot batch choice and mobile activity history.
- [ ] Run the new browser tests and fix only failures in this scope. Use separate ports if the user's 3000/4200 app is running; never reset public data.
- [ ] Run frontend unit tests/build, `node scripts/check-layers.mjs --frontend`, and all original Module 1 browser flows together with Inbound scenarios. Backend tests/build should remain green; record actual counts rather than copying old evidence.
- [ ] Request focused code review of scope/isolation and business transitions, resolve findings, update handoff and commit `test: verify inbound mock workspace flows`.

Real Inbound API, database transactions, inventory ledger, granular server permission catalog, concurrent-device idempotency, offline support and exception disposition require a separate implementation design before production use.
