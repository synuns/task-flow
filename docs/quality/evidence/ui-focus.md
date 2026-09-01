# Focus Workspace UI Evidence

Requirement/Journey: `NAV-01`~`NAV-03`, `DASH-01`, `AUTH-01`~`AUTH-06`,
`TASK-LIST-01`~`TASK-LIST-05`, `TASK-DETAIL-01`~`TASK-DETAIL-05`, `USER-01`,
`SYS-02`, `SYS-03`; auth-entry, work-overview, task-discovery, task-resolution

Branch/Commit: `feat/ui-focus`, `3011147e340c05efcbc2940ea2905dd0e2028125`

Session/Date: Codex `/root`, 2026-09-01

Precondition/Actions: approved Focus workspace spec and Ocare Yellow palette; Vite DEV with
MSW; sign in as the mock user, navigate `/sign-in` → `/` → `/task` → `/task/task-1`, open
the exact-ID delete dialog, inspect desktop and mobile layout, keyboard focus, reduced
motion, console and MSW responses

Expected: one 224px desktop sidebar and one three-action mobile bottom navigation; distinct
icon and visible label per action; soft Yellow active state with dark-gold indicator; 960px
maximum content; single dashboard summary Card; remaining-viewport virtual task list;
readable task detail; exact-ID destructive confirmation without clipping; no accepted API,
auth, cache or delete semantic change

Actual: at 1280×800 the content measured 960px, every ordinary Card had no shadow, the
dashboard used one summary sentence/rail/three-value `dl`, and the task region occupied the
remaining 580px of its 704px page. At 390×844 every navigation target measured 48px and
contained one icon, main bottom padding was 112px, no horizontal overflow occurred, the
active indicator resolved to `rgb(138, 109, 0)`, and reduced-motion shortened the progress
transition. The delete dialog measured x=16..374 and y=259..585, focused Cancel first,
enabled confirmation only for the exact task ID, and restored focus after Escape.

Automatic verification: `./scripts/verify quick` PASS; `./scripts/verify full` PASS on
`3011147` — setup hook 86 and contract 18, format, lint, generated API check, TypeScript,
35 Vitest files/126 tests, production build, five Chromium core cases across all four
Journeys, verifier regression 19; `git diff --check` PASS

Console/Network: the fresh anonymous bootstrap produced the expected refresh 401; sign-in,
dashboard, task pages and task detail returned MSW 200 responses; protected requests used
the existing bearer flow; no unexpected console or page error remained

Screenshot/Trace: `/tmp/kbhc-ui-final2-dashboard-desktop.png`,
`/tmp/kbhc-ui-final2-dashboard-mobile.png`, `/tmp/kbhc-ui-3011147-task-mobile.png`,
`/tmp/kbhc-ui-3011147-delete-mobile.png`; the full gate produced the five Playwright
journey attachments

Failure/Correction/Rerun: the first independent review found Important dashboard, task-list
and shell composition drift plus four minor state details. Commit `52170ed` corrected the
approved composition; review then returned `PASS_WITH_LOW`. Commit `3011147` corrected the
remaining loading skeleton, page-error action duplication and redundant shadow class.
Focused tests, core E2E and full verification all passed after correction.

Review target: `3011147e340c05efcbc2940ea2905dd0e2028125`

Reviewer: implementation author와 분리된 read-only `/root/ui_plan_review`

Checks: approved spec/plan, dependency scope, dashboard, responsive shell, virtual task
list, sign-in help/error dialog, task detail/delete/404, desktop/mobile evidence, changed
E2E viewport and `52170ed..3011147` correction diff

Findings: final target에서 Critical, Important, Minor 모두 없음

Corrections: single dashboard Card와 skeleton, flex remaining-viewport list, approved shell
label/active indicator/max width, unique 404 message, password help, page loading/error
state와 flat task Card를 적용

Rerun: focused component tests PASS, `./scripts/verify quick` PASS, Chromium core 5/5,
`./scripts/verify full` PASS, `git diff --check` PASS

Verdict: PASS — unresolved HIGH/MEDIUM finding 없음. 이 결과는 Golden Journey의
`HUMAN_APPROVED` 또는 최종 사람 acceptance를 뜻하지 않는다.
