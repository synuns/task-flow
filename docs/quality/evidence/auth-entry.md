# Auth Entry Evidence

Requirement/Journey: `NAV-02`, `NAV-03`, `AUTH-01`~`AUTH-07`; `auth-entry`
Commit: `04129b9` (`fix/dec-prefix` worktree)
Route/Viewport: `/sign-in`, `/task/task-1`, `/user`; Chromium 1280x720 and 390x844
Precondition: fresh browser context, empty memory access token, reset MSW auth fixture,
no application token storage
Actions: run focused Vitest for sign-in, app auth, auth API/client and authenticated
request; run `./scripts/verify quick`; run `pnpm exec playwright test
e2e/auth-entry.spec.ts`; inspect architecture boundaries with `rg`; directly enter a
protected detail route, sign in, reload through the refresh-cookie bootstrap, navigate
to profile; submit wrong credentials by keyboard and close the error dialog
Expected: labels and validation gate submit; exact credentials reach sign-in once; 400
`errorMessage` is modal content and focus restores; anonymous protected entry redirects
without rendering protected content; a same-origin registered return route is restored;
reload rotates the refresh cookie; sign-in/profile actions are mutually exclusive;
protected requests inject the current bearer, refresh is single-flight, each original
request replays at most once, late old-token 401 uses the latest token without another
refresh, current replay 401 terminates auth and protected cache only, and stale session
responses do not change current state
Actual: focused Vitest passed 10 files/50 tests; quick gate passed setup 79 tests,
format, lint, generated API type check, TypeScript and Vitest 18 files/69 tests; both
Chromium cases passed; browser bootstrap sent two refresh requests total (fresh 401,
reload 200); integration assertions observed `Bearer token-b` after preflight refresh,
`Bearer token-a` then `Bearer token-b` for late 401 with zero extra refresh, exactly one
refresh and one replay before terminal termination, matching protected-query removal,
and stale generation no-op; allowlist tests replaced external, `/sign-in`, malformed and
unregistered return candidates with `/`; static checks found no `shared` import from
`app`, no production auth `localStorage`/`sessionStorage`, and no provider/transport
navigation call
Console/Network: the fresh anonymous bootstrap 401 and intentional credential 400 were
asserted by exact status/count; no unexpected console error and no page error; refresh
cookie is read and persisted only by MSW/mock-server code
Screenshot/Trace: Playwright `auth-entry` and `auth-credential-failure` PNG attachments;
trace, screenshot and video retained automatically on failure
Verdict: `AUTH-UI-01`, `AUTH-API-01`, `AUTH-STATE-01`, and `AUTH-NAV-01`
`AI_VERIFIED`; `JOURNEY-AUTH-01` checkpoint approval was received and is not marked
`HUMAN_APPROVED` by AI
Human checkpoint record: 2026-08-31 사용자 대화에서 checkpoint 승인 수신; 프로젝트
규약에 따라 AI가 상태를 `HUMAN_APPROVED`로 변경하지 않음
Failure class: `INTEGRATION` — initial reload lost mock server refresh-session state;
`TEST` — first mobile keyboard assertion initially ignored the preceding global nav
Correction: persist the server-side MSW fixture state across page module reload in
mock-only `sessionStorage`, add a module-reload regression test, and assert the real
keyboard order (dashboard, task, sign-in, email, password, submit)
Rerun verdict: PASS — fixture/auth integration, quick gate, static boundaries and two
core browser cases passed; lightweight adversarial review found no remaining auth-policy
omission, state/cache mutation path, architecture reversal, accessibility gap or weak
negative-path assertion
