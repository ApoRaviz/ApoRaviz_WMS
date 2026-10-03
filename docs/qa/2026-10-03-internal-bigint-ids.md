# Internal IDs: verification and deployment

Branch `refactor/internal-bigint-ids`, base `eda16b9`, implementation `ca5e6bb`.

## Implemented contract

- Users/Projects/Clients/Warehouses: `id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, separate unique `public_id` preserving every existing identifier. New public IDs use PostgreSQL 18 UUIDv7, generated on insert.
- All ten FKs referencing these entities use bigint. Composite membership/link PKs, one-default-warehouse index, audit history index and original FK delete actions remain enforced. Added reverse FK indexes support project membership lookup, user session revocation and reference checks.
- API `id` strings, URLs, role/member selections, old sessions and audit JSON remain unchanged. Internal bigint values never become JavaScript Numbers or public response IDs.
- Legacy public IDs include `apo` and `legacy-*`, so their unique column deliberately remains text. This retains one public lookup index per entity; IDs are no longer repeated as long strings throughout relationship indexes. Codes such as APO/WH-01 remain separate.
- Concurrent initialization of an existing legacy schema no longer races to insert the same bootstrap administrator; conflict handling preserves the existing account and credentials. Simultaneous first-ever schema creation remains an existing unverified concurrency case; initialize with one instance.

## Verification evidence

- Backend build and final 32/32 integration tests passed; frontend 26/26, production build and source boundaries passed.
- Edge 11/11 passed against an isolated migrated database on API3002/UI4202: Login, selected Project/reload, role access, Users CRUD, password changes/reset, session revocation, logout failures, Project Setup draft/activation, dirty decisions, conflict recovery, mobile and cross-editor membership concurrency.
- Migration fixture contains old public IDs, member roles, one Warehouse shared by two Projects, stock/work flags, an existing session, password hash, nullable updater, settings and JSON audit. Upgrade and repeat initialization preserve their logical values/links.
- Test creates an unexpected external FK: migration fails, every old ID/session relationship and migration marker remain intact, then migration succeeds after the test-only dependency is removed.
- A held row lock causes migration to fail after its bounded wait with `55P03`; the old session reference and absent migration marker are checked. Releasing the lock and retrying successfully migrates the schema and preserves the existing session.
- Numeric values above `Number.MAX_SAFE_INTEGER` remain exact through concurrent allocation and repository/session/member operations. New public IDs are UUIDv7 and remain separate from numeric PKs.
- Invalid Project/User references return errors without creating partial users, deleting memberships or adding audit/version updates.

## Measured storage

Run from repository root:

```powershell
.\.tools\node-v24.21.0-win-x64\node.exe scripts/benchmark-id-storage.mjs
```

The script creates and cleans a random `test_idbench_*` schema containing only synthetic records. It does not read or change public tables. Observed PostgreSQL 18.6, 100,000 parent records and 400,000 relationships, two FK columns and forward/reverse relationship indexes:

| Representation | Parent indexes MiB | Relationship indexes MiB | Combined indexes MiB |
|---|---:|---:|---:|
| UUIDv4 stored as text | 7.34 | 101.11 | 108.45 |
| UUIDv7 native uuid | 3.03 | 50.88 | 53.91 |
| bigint + separate public text ID | 7.81 | 31.77 | 39.59 |

The bigint result includes the additional public-ID unique index. Its combined indexes were about 63.5% smaller than the current text-UUID baseline in this fixture. Parent indexes alone are slightly larger due to the compatibility index. All EXPLAIN plans used the expected indexed lookup/join and returned four matching relationships. These measurements demonstrate key/index storage and query-path behavior, **not production throughput, a universal speedup, or a guarantee that existing heap files shrink immediately**. Random fixture results vary slightly between runs.

## Deployment: coordinated maintenance

This migration changes columns used by old binaries. Do not run an old backend concurrently with the new schema, and do not use rolling deployment for this release. The work in this branch has only been tested in isolated schemas; it has not migrated the owner's public database.

1. Stop every backend/worker writing this database and retain the matching previous application release (`eda16b9`). Keep the existing PostgreSQL volume. Never use `docker compose down -v`.
2. Take a PostgreSQL custom-format backup and verify restoration into a separate database. Example for this repository's Compose service (`postgres`, database/user `wms`), from repository root:

   ```powershell
   $backupStamp = Get-Date -Format 'yyyyMMddHHmmss'
   $backupFile = "wms-before-ids-$backupStamp.dump"
   $restoreDb = "wms_restore_check_$backupStamp"
   New-Item -ItemType Directory -Force .local/backups | Out-Null
   docker compose exec -T postgres pg_dump -U wms -d wms -Fc -f "/tmp/$backupFile"
   if ($LASTEXITCODE -ne 0) { throw 'Backup failed; stop deployment' }
   docker compose cp "postgres:/tmp/$backupFile" ".local/backups/$backupFile"
   if ($LASTEXITCODE -ne 0) { throw 'Backup copy failed; stop deployment' }
   docker compose exec -T postgres createdb -U wms "$restoreDb"
   if ($LASTEXITCODE -ne 0) { throw 'Restore database creation failed; stop deployment' }
   docker compose exec -T postgres pg_restore -U wms -d "$restoreDb" --exit-on-error --no-owner "/tmp/$backupFile"
   if ($LASTEXITCODE -ne 0) { throw 'Restore verification failed; stop deployment' }
   ```

   This avoids piping a binary dump through Windows PowerShell. Backups contain sensitive account/data records: keep them in ignored `.local`, outside Git. Retain the backup and isolated restore until application checks pass. Check expected account/project/member/audit counts in the restored DB, then rehearse this release with `DATABASE_URL` pointing to that restore before the real restart. Do not publish database credentials or dump contents. The commands are an operator runbook; they were not run against the owner's real DB during development.
3. With backup/restore verified, build and start one new backend: `.\backend.cmd run build` then `.\backend.cmd start`. Startup applies migration003 transactionally; PostgreSQL 18 is required. The migration uses exclusive table locks and a 5-second lock timeout. If it fails, do not retry blindly: inspect blockers/dependencies first. Its marker and schema changes roll back together. Existing data is not reset.
4. Verify Login with an existing account/session, old Project URLs, Client/Warehouse names, membership roles, allowed/default warehouses and audit history. Refresh browser pages. Only then enable other new-version instances.

On failure before commit, the old schema remains valid. On failure after commit, stop new processes and restore the verified pre-migration backup into a replacement database, deploy the matching previous binary and point it at that restored database. Do not simply start the old binary against the new schema. Restoring a pre-migration backup discards subsequent writes, so keep traffic stopped until acceptance.

Plan adequate free disk/time for FK backfill and index rebuilding. Existing heap pages may contain dead tuples/dropped-column space after conversion. Normal VACUUM makes space reusable; returning space to the filesystem may require scheduled compaction with its own locks/disk budget. No automatic VACUUM FULL or forced production compaction is included.

## Decisions

Final whole-branch review of `eda16b9..ca5e6bb` found no Critical or Important defects. Its Minor recommendation to exercise lock-timeout rollback/retry is covered by the final test addition. The reviewer did not independently rerun suites or inspect production data; the executor ran the verification above. Documentation/runbook changes were finalized after that implementation review. No production throughput or migration-duration claim is made.

Executed the requested migration design in the existing runnable checkout on a new branch. Preserved the owner's angular.json and running ports3000/4200. Kept natural role/permission keys and token hashes. Selected stable public IDs plus compact internal keys over breaking API IDs or retaining UUIDs in every FK. Deferred actual public-DB deployment to the owner's controlled maintenance/restart, with backup/restore steps above. Master-data editing and Inbound remain separate work.
