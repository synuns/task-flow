# Task CRUD Evidence

## TASK-CRUD-JOURNEY-VERIFY-01

Requirement/Journey/case trace: `TASK-CRUD-01`~`TASK-CRUD-08`; `task-crud`.
The core cases are exactly `@core Task CRUD 성공 흐름과 소유 상태를 유지한다` and
`@core 상태 변경 실패는 상세와 현황 값을 보존한다` under the `@task-crud` tag.

Target: branch `feat/task-crud`, implementation base `2421483`; Journey verification base
`8ecda7e`. Session owner: Codex `/root`.

Automatic verification:

- Focused Vitest: create/update features, Task fixture/handler, detail page and virtual list —
  PASS, 5 files/52 tests.
- Quick: `pnpm verify quick` — PASS, hook 85, verifier 20, Vitest 47 files/248 tests,
  format, lint, generated API check and typecheck.
- Mapped E2E: `pnpm playwright test e2e/task-crud.spec.ts` — Chromium 2/2 PASS without
  retry after correction. The success case used the POST response ID to locate the created Task
  anywhere in the refetched paginated list, sent three exact one-field PATCH bodies, observed
  dashboard 4/2/2, then required the exact ID before deletion. The independent failure case
  returned a controlled PATCH 500 and preserved TODO plus dashboard 3/2/1.
- Full: `pnpm verify full` — PASS, production build, all core Chromium 9/9 without retry,
  verifier regression 19/19 and read-only fingerprint check.

Named browser verification: agent-browser session `task-crud-journey-verify-01`; Vite
`http://127.0.0.1:5173`; Chromium `390x844` then `1280x720`; session closed successfully.

- Mobile success: the header action measured 358px in the 390px viewport and the document had
  no horizontal overflow. Opening the modal focused `create-task-title`; cancel returned focus to
  `새 할 일`. Creating `브라우저 CRUD 여정` produced server ID `task-4`, which appeared on the
  terminal list page without a row-order assumption. Title edit focused its labelled input and
  disabled the memo edit action. The status snapshots moved from TODO to IN_PROGRESS to DONE
  with exactly one `aria-pressed=true`. Dashboard then rendered total/rest/done 4/2/2.
- Desktop failure and deletion: a one-shot browser fetch boundary returned PATCH 500 for
  `task-1`. The row alert rendered while TODO remained pressed, DONE remained unpressed, and the
  dashboard stayed 4/2/2. For created `task-4`, confirmation `task-4 ` kept delete disabled;
  exact `task-4` deleted once, redirected to `/task`, and removed the created card.
- Diagnostics: both viewports reported no horizontal overflow. `agent-browser errors` and page
  errors were empty. Console contained the expected initial anonymous refresh 401 and MSW
  200/201 transaction records; the controlled PATCH 500 was produced before MSW intentionally.
  Service-worker traffic details are independently asserted by Playwright request bodies/statuses.
- Screenshots: `/tmp/task-crud-mobile-list.png`, `/tmp/task-crud-mobile-modal.png`,
  `/tmp/task-crud-mobile-detail.png`, `/tmp/task-crud-mobile-dashboard.png`,
  `/tmp/task-crud-desktop-status-failure.png`,
  `/tmp/task-crud-desktop-dashboard-after-failure.png`,
  `/tmp/task-crud-desktop-after-delete.png`.

Failure classification/correction: the first quick run required only Biome formatting in the new
E2E source (`TOOLING`). The first mapped E2E used partial-name `할 일`, which also matched
`할 일 삭제`; class `TEST`. Status locators were changed to exact accessible-name matches and the
rerun passed 2/2 without retry. No product correction was required.

## TASK-CRUD-JOURNEY-REVIEW-01

Review target: base `2421483ec98c9a698fbd1e3714bda626f6cd4d58`, implementation target
`c53903a7004b75009e31a61c2c8a6e77214bf45e`, Task CRUD plan and
`TASK-CRUD-01`~`TASK-CRUD-08`.

Reviewer: on 2026-09-03 Codex `/root` performed a fresh read-only second pass after implementation.
The active runtime policy prohibited a separate subagent, so this does not claim reviewer
independence; the person checkpoint remains the external review boundary.

Checks: reviewed the authoritative and extension OpenAPI boundaries, generated guards, owner
isolation, server-owned ID/date/default status, exact one-field PATCH, POST outcome-unknown policy,
non-optimistic mutations and invalidations, field edit/status/delete behavior, responsive and
accessibility evidence, mapped E2E, TODO dependencies, and the exact branch diff. Confirmed
`assignment-original/`, `src/generated/openapi.ts`, and `pnpm-lock.yaml` are unchanged.

Findings: no unresolved HIGH, MEDIUM, or LOW finding. The existing Vite chunk-size advisory is a
non-failing build warning, not an open Task CRUD finding.

Corrections: none in the review task. The earlier mapped-E2E partial-name ambiguity was already
classified as `TEST`, corrected, and verified before this review target.

Rerun: contract Vitest 3 files/17 tests and focused Vitest 5 files/52 tests PASS;
`pnpm verify quick` PASS with hook 85, verifier 20, and Vitest 47 files/248 tests; mapped Chromium
2/2 PASS without retry; `pnpm verify full` PASS with production build, core Chromium 9/9 without
retry, verifier regression 19/19, and read-only comparison. `git diff --check` and the authoritative
OpenAPI/generated/lockfile diff checks PASS. The named two-viewport browser evidence was reviewed;
no UI correction required a browser rerun.

Verdict: **PASS**. No unresolved finding remains on the reviewed target. This does not mark
`JOURNEY-TASK-CRUD-01` as `HUMAN_APPROVED`; final Golden Journey acceptance belongs to a person.

## JOURNEY-TASK-CRUD-01 Human Decision

On 2026-09-04 the user reviewed the presented Task CRUD manual checklist and explicitly replied
`승인`. The approved exact target is `e01c7d8f87e8d34786395da9d22f038e35586945`, which includes
the implementation, automatic/browser evidence, and adversarial review. This records the person's
decision; it is not an AI acceptance judgment.
