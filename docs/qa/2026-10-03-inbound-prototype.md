# Inbound prototype verification — 2026-10-03

Scope: standalone design preview on branch `feat/inbound-mock`, based on Module 1 refactor `d9ba964`. No production Angular/backend source changes or database mutations.

## Evidence

Playwright with headless Microsoft Edge against `http://127.0.0.1:4300` passed the following flows. Local verification scripts are in ignored `.local/verify-inbound.cjs`, `.local/check-inbound-review.cjs` and `.local/capture-inbound.cjs`; these are session diagnostics, not the future Angular regression suite.

| Check | Result |
|---|---|
| Queue/search/no-results/reset | Passed |
| Barcode selects item and focuses quantity without receiving automatically | Passed |
| Receive 90 + 90 paper, then 60 soap; inspect three batches and put away | Completed with correct totals |
| Replay latest command | No extra quantity or table changes |
| Inspect 180 accepted / 20 rejected; store accepted quantity | ON_HOLD with 20 quarantined |
| Squ config disables lot/expiry/inspection | Receive → putaway → completed |
| Project switch and Mdr empty state | Passed |
| Customer read-only | No create action; no writable receiving form |
| Create draft → release | Passed |
| Simulated load error → retry | Passed |
| Over-receipt, negative quantity, project mismatch, expired receipt | Rejected |
| Same ID/payload replay vs changed payload | Single effect; changed payload conflicts |
| Pending receive followed immediately by reset | Cancelled; restored plan remains received 0 |
| Same lot across two SKUs | Inspection/putaway history contains SKU, batch ID and lot |
| Queue/detail at 360, 768, 1024 and 1440px | No page overflow |
| Keyboard opens dialog; Escape closes; focus returns | Passed at all four widths |
| Activity on mobile | Visible |
| Browser page errors / `/api/` requests during main walkthrough | None / none |

The reset regression was reproduced before the fix: a pending 10-piece receipt altered newly restored fixtures after reset. The corrected preview checks the original form/context before executing the local simulated operation. This does not imply that a future HTTP request can be cancelled after server commit.

Independent review found two important issues (pending operation lifetime and ambiguous batch history) and three minor inconsistencies (mobile target size, quarantine count, fixture descriptions); all were addressed. Five final screenshots were captured without transient toasts. Desktop queue/inspection and mobile receiving were visually inspected after fixes; labels, violet focus ring and form layout are clear.

## Limits

Fixtures and mock role checks are not production authorization. Replay handling demonstrates single-tab behavior only, not concurrent devices or transaction safety. The create dialog currently makes one-SKU drafts; the future Angular plan includes a multi-line editor. No stock ledger, actual receiving/quarantine location records, offline storage, scanner hardware or camera integration was tested. Login/Module 1 verification is recorded separately in [the recheck report](2026-10-03-module1-recheck.md).
