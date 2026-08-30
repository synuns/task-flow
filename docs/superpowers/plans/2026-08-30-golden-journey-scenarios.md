# Golden Journey Integrated Scenarios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원본 requirement와 OpenAPI에 trace되는 Master Journey와 네 독립 실행 Journey를 `docs/quality/requirements.md`의 단일 실행 시나리오로 만든다.

**Architecture:** Master Journey는 Journey 연결과 정책 gate만 설명하고 자동 test를 만들지 않는다. `auth-entry`, `work-overview`, `task-discovery`, `task-resolution`은 각자 초기 상태와 fixture를 reset해 독립 실행하며, 정상 경로와 OpenAPI가 정의한 핵심 예외 경로를 같은 Journey에 둔다. 이번 작업은 문서·정적 검증만 변경하고 FSD source 구조는 만들지 않는다.

**Tech Stack:** Markdown, Python `unittest`, repository `scripts/verify`, OpenAPI 3.1 source contract

## Global Constraints

- `assignment-original/` 아래 파일은 읽기 전용이며 수정, 이동, 삭제, 재format하지 않는다.
- API route, method, parameter, status, request·response schema는 `assignment-original/openapi.yaml`만 따른다.
- 화면과 사용자 상호작용은 `assignment-original/requirement.md`만 따른다.
- 인증·보호 route 정책은 `DEC-AUTH-01`, 삭제 실패·cache 일관성은 `DEC-DELETE-01` gate로 남긴다.
- OpenAPI에 없는 endpoint, field, status response, domain data를 만들지 않는다.
- Master Journey를 하나의 E2E test로 만들지 않는다.
- 네 Journey는 서로의 실행 결과에 의존하지 않는다.
- 현재 scaffold 이후 실제 기능 소비 시점에는 FSD layer 생성이 가능하다.
- `src/generated/openapi.ts`는 `src/shared/api` 내부에서만 직접 import하고 외부로 re-export하지 않는다.
- auth provider placeholder, 빈 layer directory, 소비자 없는 빈 `index.ts`를 만들지 않는다.
- directory와 public API는 실제 소비자가 생기는 testable unit에서만 생성한다.
- 첫 API boundary 구현은 Biome `noRestrictedImports`의 허용·차단 case를 자동 검증해야 한다.

---

## File Map

- Modify: `docs/quality/requirements.md` — Master Journey와 네 독립 Journey의 실행 시나리오 단일 기준
- Modify: `scripts/verify` — 통합 시나리오 필수 heading·decision gate marker 검증
- Modify: `tests/test_verify.py` — 시나리오 marker와 후속 FSD 제약 문서 계약 검증
- Modify: `docs/coding-standards.md` — 조건부 승인된 FSD 생성·generated import 경계
- Modify: `TODO.md` — `SCN-01` evidence와 `DEC-ARCH-01`·`ARCH-01` 실행 조건
- Do not modify: `assignment-original/requirement.md`, `assignment-original/openapi.yaml`
- Do not create: `src/app`, `src/pages`, `src/widgets`, `src/features`, `src/entities`, `src/shared`, 각 layer `index.ts`
- Do not modify yet: `biome.json` — `src/shared/api` 소비자가 생기는 `ARCH-01`에서 rule과 검증을 함께 추가

## Interfaces

- `docs/quality/requirements.md` consumes: original UI requirements, OpenAPI operations and schemas, existing requirement IDs
- `docs/quality/requirements.md` produces: Master Journey index and four independently executable scenario contracts
- `scripts/verify` consumes: required scenario marker tuple
- `./scripts/verify setup` produces: read-only PASS/FAIL evidence for scenario document structure
- `docs/coding-standards.md` produces: future FSD implementation constraints consumed by `DEC-ARCH-01` and `ARCH-01`

---

### Task 1: Golden Journey 문서 계약을 RED로 고정하고 통합 시나리오 작성

**Files:**
- Modify: `tests/test_verify.py`
- Modify: `scripts/verify`
- Modify: `docs/quality/requirements.md`

**Interfaces:**
- Consumes: current requirement checklist IDs and `assignment-original/openapi.yaml`
- Produces: `REQUIRED_MARKERS["docs/quality/requirements.md"]`가 검증하는 Master Journey와 네 독립 Journey

- [ ] **Step 1: 통합 시나리오 marker 계약 test를 추가한다**

`VerifyCliTests`에 다음 test를 추가한다.

```python
def test_setup_requires_integrated_journey_contract_markers(self):
    verifier = load_verify_module()
    markers = verifier.REQUIRED_MARKERS["docs/quality/requirements.md"]
    for marker in (
        "## Scenario Execution Rules",
        "## Master Journey",
        "## Independent Journey Contract",
        "Decision gate: `DEC-AUTH-01`",
        "Decision gate: `DEC-DELETE-01`",
    ):
        with self.subTest(marker=marker):
            self.assertIn(marker, markers)
```

- [ ] **Step 2: RED를 확인한다**

Run:

```bash
python3 -m unittest tests.test_verify.VerifyCliTests.test_setup_requires_integrated_journey_contract_markers -v
```

Expected: FAIL because the five new markers are absent from `REQUIRED_MARKERS`.

- [ ] **Step 3: verifier에 필수 marker를 추가한다**

`scripts/verify`의 `docs/quality/requirements.md` marker tuple을 다음과 같이 만든다.

```python
"docs/quality/requirements.md": (
    "## Scenario Execution Rules",
    "## Master Journey",
    "## Independent Journey Contract",
    "### auth-entry",
    "### work-overview",
    "### task-discovery",
    "### task-resolution",
    "Decision gate: `DEC-AUTH-01`",
    "Decision gate: `DEC-DELETE-01`",
    "AI may set every status except `HUMAN_APPROVED`",
    "Authorization: Bearer <accessToken>",
),
```

- [ ] **Step 4: Golden Journeys section을 공통 실행 규칙과 Master map으로 교체한다**

`docs/quality/requirements.md`의 `## Golden Journeys`부터 `## Invariants` 직전까지를 아래 구조로 교체한다. Requirement checklist는 수정하지 않는다.

```markdown
## Scenario Execution Rules

`assignment-original/` is read-only. API steps use only operations, statuses,
security schemes, and fields defined by `openapi.yaml`. UI-only steps use
`requirement.md`. A schema-conforming fixture value is test data, not a new
product field or behavior.

Each journey starts with a fresh browser context, query cache, and MSW fixture
state. No journey depends on another journey having run. Each scenario records
its requirement IDs, independent initial state, OpenAPI contract, actions,
observable result, and lowest sufficient evidence level.

Authentication storage, refresh replay, terminal session transition, and
signed-out protected-route behavior remain behind `DEC-AUTH-01`. Delete error
UI, modal-close behavior, duplicate-submit behavior, and list/detail/dashboard
cache consistency remain behind `DEC-DELETE-01`. A scenario names these gates
instead of choosing behavior for them.

## Master Journey

The Master Journey is a map, not an E2E test. It connects the four independently
executable journeys without making their state or execution order dependent.

| Order | Journey | Entry state | Observable exit | Decision gate |
| --- | --- | --- | --- | --- |
| 1 | `auth-entry` | Fresh signed-out `/sign-in` context | Validation, 400 error, and 200 token-response boundaries | `DEC-AUTH-01` before protected state, refresh, and authenticated navigation |
| 2 | `work-overview` | Fresh approved authenticated fixture | Navigation, dashboard metrics, and profile data | `DEC-AUTH-01` for 401 transition and signed-out protected routes |
| 3 | `task-discovery` | Fresh approved authenticated fixture with reset pages | First page, cards, bounded DOM, paging stop, and detail navigation | `DEC-AUTH-01` for 401 transition |
| 4 | `task-resolution` | Fresh approved authenticated fixture with reset task data | Detail, 404 recovery, exact-ID guard, and approved delete result | `DEC-DELETE-01` before delete error/modal/cache semantics |

## Independent Journey Contract

- Each case resets browser, query, auth, and MSW state before its first action.
- Protected journeys use the authenticated fixture approved by `DEC-AUTH-01`;
  they do not execute sign-in first.
- Exception cases do not reuse mutations or cache from a preceding success case.
- API-less validation, navigation, and modal-guard steps say `None` in the
  contract column.
- Core E2E remains at most one representative success and one critical failure
  per journey. No Master Journey E2E is created.
```

- [ ] **Step 5: auth-entry를 정상·예외 경로가 연결된 독립 시나리오로 작성한다**

```markdown
### auth-entry

Requirements: `NAV-02`, `AUTH-01` through `AUTH-07`.

Decision gate: `DEC-AUTH-01`. Before approval, executable scope ends after
validating the 200 `AuthTokenResponse`. After approval, the same journey adds
the exact protected-request, refresh, terminal-failure, and navigation results.

Independent initial state: fresh signed-out context at `/sign-in`; sign-in API
fixture reset per case; no stored token or cookie assumed.

| Case/step | Requirement | User action | OpenAPI contract | Expected result | Evidence |
| --- | --- | --- | --- | --- | --- |
| `AUTH-P1-1` | `NAV-02`, `AUTH-01` | Open `/sign-in` and inspect the form | None | Sign-in targets `/sign-in`; email and password have visible associated labels | component + browser |
| `AUTH-P1-2` | `AUTH-02`~`AUTH-04` | Enter valid email and 8-character ASCII alphanumeric password | None | Submit is enabled only when both values are valid | unit + component |
| `AUTH-P1-3` | `AUTH-05` | Submit valid values | `POST /api/sign-in`, exact `SignInRequest`, 200 `AuthTokenResponse` | One request contains only `email` and `password`; token response reaches auth boundary | integration |
| `AUTH-P2-1` | `AUTH-07`, `NAV-03` | After gate approval, trigger approved protected request | Bearer `GET /api/user` | Request sends `Authorization: Bearer <accessToken>`; profile replaces sign-in | integration + targeted browser |
| `AUTH-P2-2` | `AUTH-07` | Exercise approved expiry path | Cookie-secured `POST /api/refresh`, 200 `AuthTokenResponse` | Refresh, bounded replay, and transition exactly match `DEC-AUTH-01` | integration + targeted browser only if required |

Core exception cases:

| Case/step | Requirement | User action | OpenAPI contract | Expected result | Evidence |
| --- | --- | --- | --- | --- | --- |
| `AUTH-E1` | `AUTH-02`~`AUTH-04` | Try empty values, invalid email, 7/25-character and Korean/symbol passwords | None | Associated errors are visible and submit remains disabled | unit + component |
| `AUTH-E2` | `AUTH-06` | Submit valid values against failure fixture, then close modal | `POST /api/sign-in`, 400 `ErrorResponse` | `errorMessage` appears in accessible modal and focus restores | integration + browser |
| `AUTH-E3` | `AUTH-07` | After gate approval, exercise refresh failure | `POST /api/refresh`, 400 or 401 `ErrorResponse` | Session and route result match `DEC-AUTH-01` | integration |

OpenAPI defines only 400 for sign-in failure, so no response body is invented
for another sign-in status.
```

- [ ] **Step 6: work-overview를 독립 시나리오로 작성한다**

```markdown
### work-overview

Requirements: `SYS-03`, `NAV-01`, `NAV-03`, `DASH-01`, `USER-01`.

Decision gate: `DEC-AUTH-01` controls the authenticated fixture and every 401
session/route result.

Independent initial state: fresh approved authenticated fixture; dashboard and
user fixtures reset to OpenAPI-conforming 200 responses.

| Case/step | Requirement | User action | OpenAPI contract | Expected result | Evidence |
| --- | --- | --- | --- | --- | --- |
| `WORK-P1-1` | `NAV-01`, `NAV-03` | Open each route and use navigation | None | Dashboard/task remain visible with distinct icons; profile, not sign-in, is visible | integration + browser |
| `WORK-P1-2` | `DASH-01` | Open `/` | Bearer `GET /api/dashboard`, 200 `DashboardResponse` | Three visible metrics equal response fields | integration + browser |
| `WORK-P1-3` | `USER-01` | Open `/user` | Bearer `GET /api/user`, 200 `UserResponse` | Visible `name` and `memo` equal response | integration + browser |
| `WORK-P1-4` | `SYS-03`, `NAV-01` | Inspect mobile and desktop navigation | None | Pretendard is computed; actions are keyboard-usable without clipping | component + browser |
| `WORK-E1` | `AUTH-07`, `DASH-01`, `USER-01` | Request dashboard or user with approved invalid/expired state | Respective GET, 401 `ErrorResponse` | Session, recovery UI, and route result match `DEC-AUTH-01` | integration + browser when route behavior is involved |

No 500 response or non-contract error field is added.
```

- [ ] **Step 7: task-discovery를 독립 시나리오로 작성한다**

```markdown
### task-discovery

Requirements: `TASK-LIST-01` through `TASK-LIST-05`.

Decision gate: `DEC-AUTH-01` controls the authenticated fixture and 401 result.

Independent initial state: fresh approved authenticated fixture; reset pages
where page 1 has `hasNext: true` and terminal page has `hasNext: false`;
request counts start at zero.

| Case/step | Requirement | User action | OpenAPI contract | Expected result | Evidence |
| --- | --- | --- | --- | --- | --- |
| `DISC-P1-1` | `TASK-LIST-01` | Open `/task` | Bearer `GET /api/task?page=1`, 200 `TaskListResponse` | Page 1 is requested once and data renders | integration |
| `DISC-P1-2` | `TASK-LIST-02` | Inspect cards | `TaskItem` | Each card shows `title` and `memo`; scenario does not add `status` UI | component + browser |
| `DISC-P1-3` | `TASK-LIST-03` | Scroll growing list | None | Mounted rows remain bounded near viewport | integration + browser |
| `DISC-P1-4` | `TASK-LIST-04` | Reach terminal page | `GET /api/task?page=N`, 200 `TaskListResponse` | Each page requests once while true; false stops paging | integration + browser |
| `DISC-P1-5` | `TASK-LIST-05` | Select card | None | Route becomes `/task/:id` using response item `id` | integration + browser |
| `DISC-E1` | `TASK-LIST-01`, `TASK-LIST-04` | Open empty terminal fixture | 200 with empty `data`, `hasNext: false` | Empty state is distinct and no next page is requested | integration |
| `DISC-E2` | `TASK-LIST-04` | Trigger list end repeatedly | 200 `TaskListResponse` | One in-flight request per page; none after terminal false | integration |
| `DISC-E3` | `AUTH-07`, `TASK-LIST-01` | Request with approved invalid/expired state | `GET /api/task?page=1`, 401 `ErrorResponse` | Session, recovery, and route result match `DEC-AUTH-01` | integration |

No network/500 response body is invented.
```

- [ ] **Step 8: task-resolution을 독립 시나리오로 작성한다**

```markdown
### task-resolution

Requirements: `TASK-DETAIL-01` through `TASK-DETAIL-05`.

Decision gate: `DEC-AUTH-01` controls 401 session/route results.
Decision gate: `DEC-DELETE-01` controls delete failure UI, modal-close and
duplicate-submit behavior, and list/detail/dashboard cache consistency.

Independent initial state: fresh approved authenticated fixture; one existing
string route ID and one missing string route ID; fixtures reset per case;
request counts start at zero.

| Case/step | Requirement | User action | OpenAPI contract | Expected result | Evidence |
| --- | --- | --- | --- | --- | --- |
| `RES-P1-1` | `TASK-DETAIL-01` | Open existing `/task/:id` | Bearer `GET /api/task/{id}`, 200 `TaskDetailResponse` | `title`, `memo`, `registerDatetime` equal response | integration + browser |
| `RES-P1-2` | `TASK-DETAIL-03` | Open delete confirmation | None | Accessible modal contains ID input | component + browser |
| `RES-P1-3` | `TASK-DETAIL-04` | Enter wrong, whitespace, case-different, then exact ID | None | Disabled until exact equality; no early request | unit + component |
| `RES-P1-4` | `TASK-DETAIL-05` | Under approved policy, submit exact ID | Bearer `DELETE /api/task/{id}`, 200 `DeleteTaskResponse { success: true }` | Exact endpoint called once and success navigates `/task` | integration + browser |
| `RES-E1` | `TASK-DETAIL-02` | Open missing ID and recover | `GET /api/task/{id}`, 404 `ErrorResponse` | Missing UI shows `errorMessage`; action returns `/task` | integration + browser |
| `RES-E2` | `TASK-DETAIL-04` | Attempt non-exact ID | None | Submit disabled and DELETE count is zero | component + integration |
| `RES-E3` | `AUTH-07`, `TASK-DETAIL-05` | Exercise DELETE 401 | `DELETE /api/task/{id}`, 401 `ErrorResponse` | Result matches both decision documents | integration |
| `RES-E4` | `TASK-DETAIL-05` | Exercise DELETE 404 | `DELETE /api/task/{id}`, 404 `ErrorResponse` | Result matches `DEC-DELETE-01`; no redirect without 200 | integration + browser when modal behavior is involved |

The scenario does not choose in-flight close, duplicate submit, or cache
mutation before `DEC-DELETE-01` approval.
```

- [ ] **Step 9: marker test와 setup gate를 GREEN으로 확인한다**

```bash
python3 -m unittest tests.test_verify.VerifyCliTests.test_setup_requires_integrated_journey_contract_markers -v
./scripts/verify setup
git diff --check
git diff --name-only -- assignment-original
```

Expected: test PASS, setup PASS, no whitespace errors, and no original-directory output.

- [ ] **Step 10: 통합 시나리오를 commit한다**

```bash
git add tests/test_verify.py scripts/verify docs/quality/requirements.md
git commit -m "docs(scenario): Golden Journey 실행 시나리오 통합"
```

Expected: one commit containing only the three named files.

---

### Task 2: 후속 FSD 생성 조건과 Biome 경계 검증 gate 기록

**Files:**
- Modify: `tests/test_verify.py`
- Modify: `docs/coding-standards.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: approved post-scaffold FSD conditions
- Produces: `DEC-ARCH-01` and `ARCH-01` constraints that future API boundary work must satisfy

- [ ] **Step 1: 승인 조건 문서 계약 test를 추가한다**

`VerifyCliTests`에 다음 test를 추가한다.

```python
def test_fsd_creation_constraints_are_recorded(self):
    standards = (ROOT / "docs/coding-standards.md").read_text(encoding="utf-8")
    todo = (ROOT / "TODO.md").read_text(encoding="utf-8")
    for marker in (
        "`src/generated/openapi.ts`는 `src/shared/api` 내부에서만 직접 import한다.",
        "generated type 또는 module을 public API로 re-export하지 않는다.",
        "auth provider placeholder를 만들지 않는다.",
        "빈 layer directory와 소비자 없는 빈 `index.ts`를 만들지 않는다.",
        "Biome `noRestrictedImports`",
    ):
        with self.subTest(marker=marker):
            self.assertIn(marker, standards)
    self.assertIn("Biome `noRestrictedImports` 허용·차단 fixture", todo)
```

- [ ] **Step 2: RED를 확인한다**

```bash
python3 -m unittest tests.test_verify.VerifyCliTests.test_fsd_creation_constraints_are_recorded -v
```

Expected: FAIL on the first missing exact constraint marker.

- [ ] **Step 3: coding standards에 조건부 FSD 생성 규칙을 추가한다**

`docs/coding-standards.md`의 `### public API와 import` bullet list에 다음 내용을 추가한다.

```markdown
- Frontend scaffold 이후에도 실제 소비자가 생기는 testable unit에서만 layer
  directory와 public API를 함께 만든다.
- `src/generated/openapi.ts`는 `src/shared/api` 내부에서만 직접 import한다.
  generated type 또는 module을 public API로 re-export하지 않는다.
- 실제 인증 기능 전에는 auth provider placeholder를 만들지 않는다.
- 빈 layer directory와 소비자 없는 빈 `index.ts`를 만들지 않는다.
- 첫 API boundary 구현은 Biome `noRestrictedImports`로 `src/generated/**` 직접
  import를 `src/shared/api/**`에만 허용하고 허용·차단 fixture를 자동 검증한다.
```

- [ ] **Step 4: architecture TODO gate를 강화한다**

`DEC-ARCH-01` Acceptance 끝에 다음 문장을 추가한다.

```markdown
  FSD directory와 public API는 실제 소비 시점에만 생성하고 generated contract는
  `shared/api` 내부 소비로 제한하며 auth provider placeholder를 포함하지 않는다.
```

`ARCH-01` fields를 다음 내용으로 교체한다.

```markdown
- Deliverable: 승인된 app/pages/widgets/features/entities/shared/mocks 경계 중
  실제 소비자가 있는 directory와 public API, Biome import restriction
- Acceptance: placeholder 업무 UI, auth provider placeholder, 빈 layer, 소비자 없는
  빈 `index.ts` 없이 layer import 방향이 정적 검사된다. generated contract는
  `shared/api`만 직접 import하고 public API로 노출하지 않는다.
- Automatic verification: architecture lint/type test, Biome
  `noRestrictedImports` 허용·차단 fixture, `./scripts/verify quick`
```

- [ ] **Step 5: 문서 계약 test를 GREEN으로 확인한다**

```bash
python3 -m unittest tests.test_verify.VerifyCliTests.test_fsd_creation_constraints_are_recorded -v
./scripts/verify setup
git diff --check
```

Expected: test PASS, setup PASS, no whitespace errors.

- [ ] **Step 6: FSD source와 Biome config가 조기 생성되지 않았는지 확인한다**

```bash
find src -maxdepth 2 -type d -print | sort
git diff --name-only -- biome.json src
```

Expected: no new FSD layer directory and no `biome.json` or `src` diff.

- [ ] **Step 7: FSD 제약 문서를 commit한다**

```bash
git add tests/test_verify.py docs/coding-standards.md TODO.md
git commit -m "docs(architecture): FSD 지연 생성과 import 경계 명시"
```

Expected: one commit containing only the three named files.

---

### Task 3: SCN-01 evidence 정리와 최종 문서 QA

**Files:**
- Modify: `TODO.md`

**Interfaces:**
- Consumes: Tasks 1–2 commits and verification output
- Produces: reproducible `SCN-01` status/evidence without changing requirement row statuses

- [ ] **Step 1: scenario requirement와 OpenAPI trace를 정적 검토한다**

```bash
rg -n '^### (auth-entry|work-overview|task-discovery|task-resolution)$|`(AUTH|NAV|DASH|TASK|USER|SYS)-' docs/quality/requirements.md
rg -n 'POST /api/(sign-in|refresh)|GET /api/(user|dashboard|task)|DELETE /api/task/\{id\}|200|400|401|404' docs/quality/requirements.md
```

Expected: all four Journey headings, requirement IDs, and only OpenAPI-defined operations/statuses appear in scenario API rows.

- [ ] **Step 2: requirement checklist status가 scenario rewrite로 바뀌지 않았는지 확인한다**

```bash
git diff HEAD~2 -- docs/quality/requirements.md | rg '^[-+]\| [A-Z].*\| (AI_VERIFIED|IN_PROGRESS|NOT_STARTED|BLOCKED) \|$'
```

Expected: no output and exit 1 from `rg`, meaning checklist status rows were unchanged.

- [ ] **Step 3: Task 1 commit SHA를 확인한다**

```bash
git log --format='%H %s' --grep='Golden Journey 실행 시나리오 통합' -1
```

Expected: one full SHA followed by `docs(scenario): Golden Journey 실행 시나리오 통합`.

- [ ] **Step 4: SCN-01을 AI_VERIFIED로 갱신한다**

`TODO.md`의 `SCN-01` checkbox를 `[x]`, Status를 `AI_VERIFIED`로 바꾼다. Evidence는
`- Evidence: 2026-08-30 ` 다음에 Step 3이 출력한 실제 40자리 SHA를 붙인 뒤,
Master Journey와 네 독립 Journey 정상·핵심 예외 경로,
`DEC-AUTH-01`·`DEC-DELETE-01` gate trace, 두 focused unittest 명령,
`./scripts/verify setup`, `git diff --check` PASS, `assignment-original/` diff 없음
순서로 기록한다. 다른 TODO item이나 requirement status는 완료 처리하지 않는다.

- [ ] **Step 5: 최종 read-only verification을 실행한다**

```bash
python3 -m unittest tests.test_verify.VerifyCliTests.test_setup_requires_integrated_journey_contract_markers tests.test_verify.VerifyCliTests.test_fsd_creation_constraints_are_recorded -v
./scripts/verify setup
git diff --check
git diff --name-only -- assignment-original
```

Expected: 2 tests PASS, setup PASS, no whitespace errors, and no original-directory output.

- [ ] **Step 6: TODO evidence를 commit한다**

```bash
git add TODO.md
git commit -m "docs(scenario): 통합 시나리오 검증 근거 기록"
```

Expected: one commit containing only `TODO.md`.

- [ ] **Step 7: 최종 worktree 상태를 확인한다**

```bash
git status --short
```

Expected: no output.

## Plan Self-Review Result

- Spec coverage: Master map, independent setup, normal and contract-defined exception paths, both decision gates, evidence levels, original read-only boundary are assigned to Task 1.
- Conditional FSD coverage: on-demand directories/public APIs, generated-only-through-shared/api, no re-export, no auth placeholder, no empty layers/index, and deferred Biome allow/deny verification are assigned to Task 2.
- Status discipline: Task 3 updates only `SCN-01`; requirement checklist and human approval statuses remain unchanged.
- YAGNI: no FSD source, provider, empty index, Gherkin, Master E2E, or early Biome configuration is created by this plan.
