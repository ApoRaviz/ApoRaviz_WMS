# Internal BIGINT identities implementation

Spec: `docs/superpowers/specs/2026-10-03-internal-bigint-ids-design.md`. Base `eda16b9`; branch `refactor/internal-bigint-ids`. Execute inline under the user's request, with one independent final review. Preserve user-owned `frontend/angular.json` and services 3000/4200. No remote push.

## 1. Migration tests and schema

Add `backend/test/internal-ids.test.ts`: build old schema fixture via migrations 001/002, snapshot logical joins, migrate/reinitialize and assert bigint identity PK/FKs, same public identities/session/audit/data, default and unique constraints, referential failure, rollback and high-ID precision. Run `backend.cmd test -- internal-ids.test.ts` first: expected failure because bigint schema is absent. Add `003_internal_bigint_ids.sql`, wire ordered migration runner, update bootstrap to generate public IDs in DB. Verify migration fixture and update old migration assertions to address public IDs without changing their data-preservation checks.

## 2. Repository boundary conversion

Keep all API-facing method input IDs string public IDs; internal numeric values stay in SQL. Update UsersRepository, SessionsRepository, ProjectsRepository, SetupRepository and ReferenceRepository projections/joins/mutations. Creation returns generated public IDs from INSERT RETURNING; remove service UUID allocation. Preserve existing transaction client and lock order. Unknown references must fail via constraints, not disappear in inner joins. Adapt test-only direct SQL to map public IDs. Run backend build and complete integration suite: expected all green including existing authorization/race/audit tests. New create tests check DB-owned UUIDv7 and no internal-ID leakage.

## 3. Performance evidence and regression

Add isolated benchmark script for 100k keys/relationships (text UUIDv4, UUIDv7, bigint) with EXPLAIN and pg_relation_size; JSON output records engine version/cardinality and data/index bytes. It must create only random test-prefixed schema and clean it in finally; never touch public tables or print credentials. Run, inspect results, document bounded conclusions. Run frontend unit/build, boundaries and full Edge suite on isolated 3002/4202. Confirm Login/password/projects/Users/Setup/public URL compatibility.

## 4. Final review and handoff

One fresh read-only reviewer checks base-to-head schema conversion/SQL/API/locking/index coverage/deployment runbook. Fix material findings with failing regression then green suites. Document migration, maintenance window/backup/restore and public-ID choices in HANDOFF/ARCHITECTURE/QA. Commit changes explicitly excluding angular.json. Leave branch ready for owner testing; do not apply migration to public DB or restart real services.

## Review focus

- Missing nullable references or dropped FK/delete actions during conversion.
- Untrusted nonexistent IDs silently skipped by INSERT SELECT.
- Internal bigint exposed or coerced through JavaScript numbers.
- Old sessions/audit JSON/URLs corrupted or mixed across Projects.
- Concurrent initialization and old backend versus migrated schema; transaction/lock timeout and rollback behavior.
