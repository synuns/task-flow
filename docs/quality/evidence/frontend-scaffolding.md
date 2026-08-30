# Frontend Scaffolding Evidence

Requirement/Journey: SYS-01, SYS-02, SYS-03, SYS-04; scaffolding only
Commit: d846ee2c29f8a63ccac22be9b0a591d14ceb004c
Route/Viewport: `/`; Chromium; 1280x720
Precondition: pnpm install complete; Playwright Chromium installed; no product route, layout, handler, or FSD layer
Actions: run `./scripts/verify full`; run `pnpm test:e2e:smoke`; run `pnpm api:types:check`; open `/`; load `Pretendard`; request `/mockServiceWorker.js`
Expected: React root exists; Pretendard loads locally and is computed font; worker asset returns JavaScript; no console or page errors; generated API types are current
Actual: all automatic gates and scaffold browser assertions passed on recorded commit
Console/Network: no console or page errors; `PretendardVariable.woff2` and `mockServiceWorker.js` requests succeeded
Screenshot/Trace: Playwright `scaffold-root` attachment; trace, screenshot, and video retained on failure
Verdict: SYS-01 and SYS-03 AI_VERIFIED; SYS-02 and SYS-04 IN_PROGRESS pending product UI and OAS-conforming handlers
Failure class: none
Correction: none
Rerun verdict: PASS

## 2026-08-30 Reverification

Requirement/Journey: `SCF-01`~`SCF-04`; scaffolding only
Commit: `fac27d136e67961609e269728af0dbf6a6e0aa6d`
Route/Viewport: `/`; Chromium; 1280x720
Precondition: isolated worktree dependency install from unchanged `pnpm-lock.yaml`
Actions: run `pnpm install --frozen-lockfile`; run focused scaffold, theme, and OpenAPI
tests; run `./scripts/verify full`; run `pnpm test:e2e:smoke`; open `/` with
agent-browser; force Pretendard load; request `/mockServiceWorker.js`
Expected: package/toolchain, entry/style, OpenAPI/MSW basis, full verification and
browser smoke satisfy their recorded acceptance without product feature behavior
Actual: install, focused tests, full verification, and one Chromium smoke passed;
computed font was Pretendard; font request and worker asset request succeeded
Console/Network: no console or page errors; font request observed;
`/mockServiceWorker.js` returned 200 `text/javascript`
Screenshot/Trace: `/tmp/kbhc-scf-reverify.png`; Playwright `scaffold-root` attachment
Verdict: `SCF-01`, `SCF-02`, `SCF-03`, `SCF-04` AI_VERIFIED; product-level
`SYS-02` and `SYS-04` remain scoped to later implementation
Failure class: none
Correction: stale TODO status aligned with existing implementation and fresh evidence
Rerun verdict: PASS
