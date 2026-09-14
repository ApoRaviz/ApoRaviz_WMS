# WMS Login and Project Implementation Plan

**Goal:** Deliver a locally runnable Thai login → project selection prototype for user review.
**Architecture:** Standalone Angular pages, shared icon/brand, typed mock session service and client-side route guards. No backend APIs in this slice.
**Tech Stack:** Angular 22, TypeScript, Tailwind CSS, Node.js 24.21.0, Angular CLI tests.
**Spec:** ../specs/2026-09-14-login-project-design.md

## Constraints
- New frontend/ directory, no edits to exp/AdastriaFrontend.
- Project names Apo, Squ, Mdr; client บริษัทตัวอย่าง.
- Local Node runtime, explicit demo, no persisted credentials or real authentication claims.

## Tasks
- [x] Setup: install checksum-verified local Node 24.21.0 and UI UX skill; generate Angular 22 app with strict typing and routing; add Tailwind; record version pins.
- [x] Session flow: write behavior tests for rejection/acceptance, assignment filtering, invalid project selection and logout; observe failures; implement typed mock service with in-memory signals and asynchronous login.
- [x] UI: login form with required validation and pending/error states; project cards and search; workspace with switch/logout; route guards and shared visual primitives.
- [x] Verify: run session/route tests and production build; exercise user flows and mobile layout; fix actual defects; write local launch/review instructions.

## Results — 2026-09-14
6 unit tests pass; 5 Edge end-to-end tests pass; production build passes. Code review found a skip-link full-navigation bug, reproduced with a failing test and fixed. User review is next; do not start backend/module 2 automatically.

## Verification scenarios
Valid demo opens 3 project choices. Invalid credentials remain on login with error. Empty account has no choices. Search is case-insensitive. Unauthorized project IDs cannot open workspace. Logout clears session and selection. Back/deep links require a session. Repeated submit while pending does not perform a second login.
