# User CRUD Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do not run the Task CRUD plan until the User CRUD human checkpoint has been reviewed.

**Goal:** 현재 사용자 회원가입·조회·이름/메모 수정·비밀번호 확인 탈퇴를 승인된 API와 UI/UX로 구현하고 `user-crud` Golden Journey의 자동·browser evidence와 사람 checkpoint를 준비한다.

**Architecture:** 원본 `assignment-original/openapi.yaml`은 그대로 두고 승인된 확장만 `docs/api/crud-openapi.yaml`과 `src/generated/crud-openapi.ts`로 관리한다. `entities/user`가 공개 model과 query key를, `shared/api/user.ts`가 transport/runtime guard를, 세 user feature가 mutation UI를 소유한다. MSW user store가 credential과 profile을 보관하고 auth fixture는 기존 JWT `id` claim으로 user를 식별하며, 탈퇴 handler가 user와 소유 Task를 함께 제거한다.

**Tech Stack:** React 19, TypeScript strict, React Router, TanStack Query, React Hook Form, Zod, MSW, existing shadcn/Radix primitives, Vitest, Testing Library, Playwright, agent-browser

## Global Constraints

- 기준 설계는 `docs/superpowers/specs/2026-09-03-user-task-crud-journeys-design.md`와 `USER-CRUD-01`~`USER-CRUD-08`이다.
- `assignment-original/`은 수정하지 않는다. 기존 endpoint는 원본 OpenAPI, 승인된 CRUD 확장은 `docs/api/crud-openapi.yaml`이 authoritative하다.
- email/password 수정, 가입 memo, 자동 로그인, 관리자 사용자 목록, production backend와 새 dependency를 추가하지 않는다.
- 회원가입 email은 trim/lowercase, 최대 254자, password는 ASCII 영문·숫자 8~24자, name은 trim 1~50자다. confirmation은 client 전용이며 전송하지 않는다.
- `POST /api/user`는 자동 재시도하지 않는다. network/invalid response는 결과 미확정이며 재로그인 또는 명시적 재제출의 409로 확인한다.
- 이름·메모는 동시에 편집하지 않는다. 연필로 시작하고 체크로 제출, X로 취소하며 success response 전에는 표시값과 cache를 바꾸지 않는다.
- field identifier 없는 400은 field error로 추정하지 않고 form/row alert에 표시한다. duplicate email 409만 email field에 연결한다.
- 탈퇴는 현재 비밀번호를 요구한다. 200 success만 user/owned tasks 삭제, cookie 만료, auth/cache 정리와 `/sign-in` 이동을 만든다.
- 로그인 실패는 영구 삭제 증거가 아니다. E2E는 session 종료와 보호 route 접근 불가만, 실제 user/task 제거는 store integration test가 증명한다.
- 실행 중 TODO에서는 dependency가 해소된 task 하나만 `IN_PROGRESS`로 두고 해당 session만 그 block의 status/evidence를 갱신한다.
- 각 구현 task는 focused test 뒤 `pnpm verify quick`을 통과하고 Conventional Commit으로 닫는다.
- 최종 검증은 focused → quick → mapped E2E → named browser → full → plan-completion adversarial review 순서다.
- AI는 마지막 Journey checkpoint를 `HUMAN_APPROVED`로 표시하지 않는다.

## Execution Entry

승인된 plan commit에서 ignored linked worktree를 만든다. 이미 같은 목적의 격리 worktree가 있으면 재사용하되 clean 여부를 먼저 확인한다.

```bash
cd /Users/identity/dev/assignment/kbhc-assgn
git status --short
user_plan_target=$(git rev-parse docs/crud-journey-design)
git worktree add .worktrees/user-crud -b feat/user-crud "$user_plan_target"
cd .worktrees/user-crud
pnpm install --frozen-lockfile
pnpm verify setup
```

Expected: branch `feat/user-crud`, clean worktree, 이 plan과 승인된 spec이 존재하고 setup이 PASS한다. 원 checkout의 user-owned 변경은 가져오지 않는다.

## File Map

- Add: `docs/api/crud-openapi.yaml`, `src/generated/crud-openapi.ts`
- Modify: `package.json`, `src/shared/api/openapi-contract.test.ts`
- Modify: `docs/project-plan.md`, `docs/quality/requirements.md`, `docs/quality/verification.md`, `TODO.md`
- Add: `src/entities/user/model/user.ts`, `src/entities/user/model/user-keys.ts`, `src/entities/user/index.ts`
- Delete after consumers move: `src/widgets/user-profile/model/user-keys.ts`
- Modify: `src/shared/api/user.ts`, `src/shared/api/user.test.ts`, `src/shared/api/index.ts`
- Add: `src/mocks/fixtures/users.ts`, `src/mocks/fixtures/users.test.ts`
- Modify: `src/mocks/fixtures/auth.ts`, `src/mocks/fixtures/auth.test.ts`, `src/mocks/fixtures/tasks.ts`, `src/mocks/fixtures/tasks.test.ts`
- Modify: `src/mocks/handlers/auth.ts`, `src/mocks/handlers/user.ts` and their existing tests
- Add: `src/features/sign-up/**`, `src/pages/sign-up/index.tsx`
- Modify: `src/features/sign-in/ui/sign-in-form.tsx`, its test, `src/app/router.tsx`, `src/app/router.test.tsx`, auth route tests as required
- Add: `src/features/update-user/**`, `src/features/delete-user/**`
- Modify: `src/widgets/user-profile/index.tsx`, `src/widgets/user-profile/user-profile.test.tsx`, `src/pages/user/index.tsx`
- Add: `e2e/user-crud.spec.ts`, `docs/quality/evidence/user-crud.md`
- Modify only when the new core Journey requires it: `scripts/verify` contract assertions

## Required Interfaces

```ts
// entities/user/model/user.ts
export type User = { email: string; name: string; memo: string };
export type EditableUserField = "name" | "memo";

// shared/api/user.ts
export type CreateUserInput = { email: string; password: string; name: string };
export type UpdateUserInput = { name: string } | { memo: string };
export function createUser(input: CreateUserInput): Promise<UserProfileData>;
export function getUser(client: ApiClient, signal?: AbortSignal): Promise<UserProfileData>;
export function updateUser(client: ApiClient, input: UpdateUserInput): Promise<UserProfileData>;
export function deleteUser(client: ApiClient, password: string): Promise<{ success: true }>;

// mocks fixture boundaries
export function authenticateUser(email: string, password: string): StoredUser | null;
export function createUser(input: CreateUserInput): StoredUser | null;
export function updateStoredUser(id: string, patch: UpdateUserInput): StoredUser | null;
export function removeAccount(id: string, password: string): { removedTaskCount: number } | null;
export function bearerUserId(header: string | null): string | null;
export function revokeAuthSession(userId: string): void;
export function removeTasksByOwner(ownerId: string): number;
```

---

### Task 1: `USER-CRUD-CONTRACT-01` 확장 계약과 작업 통제면을 추가한다

**Files:** `docs/api/crud-openapi.yaml`, `src/generated/crud-openapi.ts`, `package.json`, `src/shared/api/openapi-contract.test.ts`, `docs/project-plan.md`, `docs/quality/requirements.md`, `docs/quality/verification.md`, `TODO.md`

- [ ] **Step 1: Journey를 다시 찾고 TODO task들을 등록한다**

```bash
rg -n 'USER-CRUD|/api/user|UserResponse|/sign-up|userKeys' docs/quality/requirements.md TODO.md src e2e assignment-original
git status --short
```

`USER-CRUD-CONTRACT-01`, `USER-CRUD-STORE-01`, `USER-CRUD-TRANSPORT-01`, `USER-CRUD-SIGNUP-01`, `USER-CRUD-PROFILE-01`, `USER-CRUD-DELETE-01`, `USER-CRUD-JOURNEY-VERIFY-01`, `USER-CRUD-JOURNEY-REVIEW-01`, `JOURNEY-USER-CRUD-01` block을 acceptance/verification/evidence 필드와 함께 추가한다. 첫 task만 `IN_PROGRESS`, 나머지는 `NOT_STARTED`로 둔다.

- [ ] **Step 2: extension contract가 없음을 실패로 고정한다**

`src/shared/api/openapi-contract.test.ts`에 다음 contract check를 추가한다.

```ts
import type { components as crudComponents, paths as crudPaths } from "@/generated/crud-openapi";

type CreateUser201 = crudPaths["/api/user"]["post"]["responses"][201]["content"]["application/json"];
type UserResponse = crudComponents["schemas"]["UserResponse"];

expectTypeOf<CreateUser201>().toEqualTypeOf<UserResponse>();
expectTypeOf<UserResponse>().toEqualTypeOf<{ email: string; name: string; memo: string }>();
```

```bash
pnpm vitest run src/shared/api/openapi-contract.test.ts
```

Expected RED: `@/generated/crud-openapi`을 찾을 수 없다.

- [ ] **Step 3: 최소 User OpenAPI를 작성하고 생성 script를 확장한다**

`docs/api/crud-openapi.yaml`은 OpenAPI 3.0.3 문서로 `/api/user`의 POST/GET/PATCH/DELETE, bearer security, 201/200/400/401/409와 exact schemas만 정의한다. 핵심 union은 다음처럼 `oneOf`와 `additionalProperties: false`를 사용한다.

```yaml
UpdateUserRequest:
  oneOf:
    - type: object
      additionalProperties: false
      required: [name]
      properties:
        name: { type: string, minLength: 1, maxLength: 50 }
    - type: object
      additionalProperties: false
      required: [memo]
      properties:
        memo: { type: string, maxLength: 500 }
UserResponse:
  type: object
  additionalProperties: false
  required: [email, name, memo]
  properties:
    email: { type: string, format: email, maxLength: 254 }
    name: { type: string }
    memo: { type: string }
```

`package.json`의 기존 원본 생성은 유지하고 두 번째 명령만 붙인다.

```json
"api:types": "openapi-typescript assignment-original/openapi.yaml -o src/generated/openapi.ts && openapi-typescript docs/api/crud-openapi.yaml -o src/generated/crud-openapi.ts",
"api:types:check": "openapi-typescript assignment-original/openapi.yaml -o src/generated/openapi.ts --check && openapi-typescript docs/api/crud-openapi.yaml -o src/generated/crud-openapi.ts --check"
```

```bash
pnpm api:types
pnpm vitest run src/shared/api/openapi-contract.test.ts
```

Expected GREEN: contract test PASS, 원본 `src/generated/openapi.ts` diff 없음.

- [ ] **Step 4: requirement와 verification map을 확장한다**

`docs/project-plan.md`에는 승인된 extension authority, `/sign-up`, `/user` CRUD 범위와 여섯 Journey map을 추가한다. `docs/quality/requirements.md`에는 `USER-CRUD-01`~`08` acceptance와 `user-crud` positive/failure table을, `docs/quality/verification.md`에는 `e2e/user-crud.spec.ts` mapping을 추가한다. 기존 네 Journey 문구는 여섯 Journey로 고친다.

- [ ] **Step 5: 검증하고 commit한다**

```bash
pnpm verify quick
git diff --check
git add docs/api/crud-openapi.yaml src/generated/crud-openapi.ts package.json src/shared/api/openapi-contract.test.ts docs/project-plan.md docs/quality/requirements.md docs/quality/verification.md TODO.md
git commit -m "docs(user): 사용자 CRUD 계약과 여정 등록"
```

---

### Task 2: `USER-CRUD-STORE-01` 사용자 store와 인증 소유권을 구현한다

**Files:** `src/mocks/fixtures/users.ts`, `src/mocks/fixtures/users.test.ts`, `src/mocks/fixtures/auth.ts`, `src/mocks/fixtures/auth.test.ts`, `src/mocks/fixtures/tasks.ts`, `src/mocks/fixtures/tasks.test.ts`, `src/mocks/handlers/auth.ts`, `src/mocks/handlers/auth.test.ts`, `src/mocks/handlers/tasks.ts`, `src/mocks/handlers/tasks.test.ts`

- [ ] **Step 1: store integration 실패 test를 작성한다**

다음 한 test 흐름으로 canonical signup, duplicate, 로그인, field update, 잘못된 비밀번호 무변경, 올바른 탈퇴와 cascade를 증명한다.

```ts
resetUserStore();
resetTaskStore();
const created = createStoredUser({ email: " New@Example.com ", password: "Password1", name: " 새 사용자 " });
expect(created?.email).toBe("new@example.com");
expect(createStoredUser({ email: "NEW@example.com", password: "Password1", name: "중복" })).toBeNull();
expect(authenticateUser(" new@example.com ", "Password1")?.id).toBe(created?.id);
expect(removeAccount(created!.id, "Wrong123")).toBeNull();
expect(findUser(created!.id)).not.toBeNull();
expect(removeAccount(created!.id, "Password1")).toEqual({ removedTaskCount: 0 });
expect(findUser(created!.id)).toBeNull();
```

기존 seed user의 탈퇴에는 `task-1`~`task-3`가 함께 사라지는 별도 assertion을 같은 file에 둔다.

```bash
pnpm vitest run src/mocks/fixtures/users.test.ts src/mocks/fixtures/auth.test.ts src/mocks/fixtures/tasks.test.ts
```

Expected RED: user store와 owner-aware task API가 없다.

- [ ] **Step 2: resettable user store를 최소 구현한다**

`users.ts`는 sessionStorage-backed seed user 한 명과 증가 ID를 소유한다. 저장 model만 password를 포함한다. `removeAccount`는 password 검증 뒤 user와 `removeTasksByOwner(id)`를 같은 동기 fixture operation에서 처리한다.

```ts
type StoredUser = { id: string; email: string; password: string; name: string; memo: string };
const seed = [{ id: "user-1", email: "user@example.com", password: "Password1", name: "김담당", memo: "오늘도 차근차근" }];
const canonicalEmail = (email: string) => email.trim().toLowerCase();
```

비밀번호 hashing이나 production persistence는 추가하지 않는다. MSW fixture 범위다.

- [ ] **Step 3: token을 user ID에 연결하고 로그인 handler를 store 조회로 바꾼다**

`startAuthSession(userId: string)`이 기존 JWT `id` claim을 해당 user ID로 만든다. `bearerUserId`는 exact current bearer가 맞을 때 claim을 decode하고, refresh도 active refresh token의 claim을 읽어 같은 user ID로 rotate한다. fixture state shape은 늘리지 않는다. `revokeAuthSession(userId)`은 current token claim이 일치할 때 현재 access/refresh token을 비운다. auth handler는 `authenticateUser`가 반환한 ID로 session을 시작한다.

- [ ] **Step 4: Task 소유권과 cascade 최소 경계를 추가한다**

기존 seed task에 `ownerId: "user-1"`을 저장 field로 추가하되 API projection에서는 제외한다. `listTaskPage`, `findTask`, `removeTask`, `getDashboardMetrics`가 owner ID를 받도록 바꾸고 기존 handlers/tests를 함께 갱신한다. `removeTasksByOwner(ownerId)`를 추가한다. 아직 create/update/status 기능은 만들지 않는다.

- [ ] **Step 5: focused/quick 검증 후 commit한다**

```bash
pnpm vitest run src/mocks/fixtures/users.test.ts src/mocks/fixtures/auth.test.ts src/mocks/fixtures/tasks.test.ts src/mocks/handlers/auth.test.ts src/mocks/handlers/tasks.test.ts
pnpm verify quick
git add src/mocks/fixtures/users.ts src/mocks/fixtures/users.test.ts src/mocks/fixtures/auth.ts src/mocks/fixtures/auth.test.ts src/mocks/fixtures/tasks.ts src/mocks/fixtures/tasks.test.ts src/mocks/handlers/auth.ts src/mocks/handlers/auth.test.ts src/mocks/handlers/tasks.ts src/mocks/handlers/tasks.test.ts TODO.md
git commit -m "feat(user): 사용자 저장소와 계정 소유권 추가"
```

---

### Task 3: `USER-CRUD-TRANSPORT-01` User entity와 API boundary를 구현한다

**Files:** `src/entities/user/**`, `src/shared/api/user.ts`, `src/shared/api/user.test.ts`, `src/shared/api/index.ts`, `src/widgets/user-profile/model/user-keys.ts`, `src/mocks/handlers/user.ts`, `src/mocks/handlers/user.test.ts`

- [ ] **Step 1: request/guard 실패 test를 먼저 추가한다**

`shared/api/user.test.ts`가 네 method/path/body, exact response, field 없는 400, invalid response를 검증하게 한다. PATCH는 한 field만 전송해야 한다.

```ts
await createUser({ email: "new@example.com", password: "Password1", name: "새 사용자" });
await updateUser(client, { name: "새 이름" });
await deleteUser(client, "Password1");
expect(requestBody).toEqual({ name: "새 이름" });
```

```bash
pnpm vitest run src/shared/api/user.test.ts src/mocks/handlers/user.test.ts
```

Expected RED: POST/PATCH/DELETE functions와 handler가 없다.

- [ ] **Step 2: entity slice를 만들고 query key를 이동한다**

`entities/user/model/user.ts`, `model/user-keys.ts`, `index.ts`만 추가한다. 기존 key 값 `['user']`를 유지하고 widget consumer를 public API import로 옮긴 뒤 `widgets/user-profile/model/user-keys.ts`를 삭제한다. entity가 credential을 노출하지 않는 architecture assertion을 추가한다.

- [ ] **Step 3: generated type + runtime guard로 transport를 확장한다**

기존 `requestJson`은 public POST에, `ApiClient.request`는 보호된 GET/PATCH/DELETE에 재사용한다. 모든 response는 exact key와 primitive를 검사한다. `UpdateUserInput`은 union이므로 generic patch abstraction을 만들지 않는다.

- [ ] **Step 4: user handlers를 구현한다**

POST는 public validation/201/409, GET은 bearer user, PATCH는 exact one-key object, DELETE는 `removeAccount` 성공 뒤 `revokeAuthSession`과 refresh cookie 만료를 구현한다. 400 body는 `{ errorMessage }`만 유지한다. 삭제의 user+task removal은 handler test 외에 Task 2 store integration test가 증명한다.

- [ ] **Step 5: 검증하고 commit한다**

```bash
pnpm vitest run src/shared/api/user.test.ts src/mocks/handlers/user.test.ts src/test/architecture-contract.test.ts
pnpm verify quick
git add src/entities/user src/shared/api/user.ts src/shared/api/user.test.ts src/shared/api/index.ts src/widgets/user-profile src/mocks/handlers/user.ts src/mocks/handlers/user.test.ts src/test/architecture-contract.test.ts TODO.md
git commit -m "feat(user): 사용자 CRUD API 경계 구현"
```

---

### Task 4: `USER-CRUD-SIGNUP-01` 익숙한 회원가입 화면을 구현한다

**Files:** `src/features/sign-up/**`, `src/pages/sign-up/index.tsx`, `src/features/sign-in/ui/sign-in-form.tsx`, matching tests, `src/app/router.tsx`, `src/app/router.test.tsx`, applicable auth boundary tests

- [ ] **Step 1: schema와 route/component RED를 작성한다**

schema tests는 trim/lowercase, email max 254, ASCII alphanumeric password 8~24, confirmation equality, trimmed name 1~50를 검증한다. component test는 field 아래 client error, duplicate 409의 email error, generic 400/network/invalid response의 form alert, pending 중 중복 submit 방지, success `/sign-in` 이동과 자동 로그인 부재를 검증한다. router test는 navigation에 가입 항목이 없고 로그인 form의 일반 link만 `/sign-up`을 가리키는지 확인한다.

```bash
pnpm vitest run src/features/sign-up src/app/router.test.tsx src/features/sign-in
```

Expected RED: sign-up slice/page/route가 없다.

- [ ] **Step 2: schema를 기존 로그인 규칙에서 재사용한다**

기존 sign-in schema에서 `loginEmailSchema`와 `loginPasswordSchema`를 export해 규칙을 중복 선언하지 않는다. email schema는 trim/lowercase, required, max 254와 email syntax를 소유한다. sign-in과 sign-up submit은 각각 `signInSchema.parse(values)`, `signUpSchema.parse(values)` 결과를 API에 보내 transform이 request body에도 적용되게 한다. sign-up schema는 confirmation refine와 name만 더한다.

```ts
export const signUpSchema = z
  .strictObject({ email: loginEmailSchema, password: loginPasswordSchema, passwordConfirmation: z.string(), name: z.string().trim().min(1).max(50) })
  .refine((value) => value.password === value.passwordConfirmation, { path: ["passwordConfirmation"], message: "비밀번호가 일치하지 않습니다." });
```

- [ ] **Step 3: 집중형 form과 route를 구현한다**

폼 순서는 이메일→비밀번호→비밀번호 확인→이름, 하단에는 form alert와 `이미 계정이 있나요? 로그인` link를 둔다. navigation에는 아무 항목도 추가하지 않는다. authenticated 상태에서 `/sign-up` 접근 시 기존 boundary 정책대로 보호 화면으로 돌려보낸다.

- [ ] **Step 4: outcome-unknown 복구를 구현한다**

POST network/invalid response에는 성공/실패를 단정하지 않는 문구와 `로그인으로 결과 확인` link를 표시한다. 자동 submit/retry를 호출하지 않는다. 사용자가 다시 제출했을 때 받은 409만 email field에 연결한다.

- [ ] **Step 5: 검증하고 commit한다**

```bash
pnpm vitest run src/features/sign-up src/app/router.test.tsx src/features/sign-in src/app/auth/auth-route-boundary.test.tsx
pnpm verify quick
git add src/features/sign-up src/pages/sign-up src/features/sign-in src/app/router.tsx src/app/router.test.tsx src/app/auth TODO.md
git commit -m "feat(user): 회원가입 화면과 진입 링크 추가"
```

---

### Task 5: `USER-CRUD-PROFILE-01` 한 필드씩 수정하는 profile UX를 구현한다

**Files:** `src/features/update-user/**`, `src/widgets/user-profile/index.tsx`, `src/widgets/user-profile/user-profile.test.tsx`, `src/pages/user/index.tsx`

- [ ] **Step 1: edit state와 비낙관 mutation RED를 작성한다**

component test는 canonical email read-only 표시, 각 name/memo 오른쪽 연필의 accessible name, 한 field만 편집, 체크 submit, X 취소/원값 복구를 검증한다. 지연된 PATCH 중 다른 field 값과 query cache가 바뀌지 않아야 하며, success 뒤에만 response로 갱신한다. field 없는 400은 행 alert이고 field error가 아니다.

```bash
pnpm vitest run src/features/update-user src/widgets/user-profile/user-profile.test.tsx
```

Expected RED: email/edit controls와 update mutation이 없다.

- [ ] **Step 2: domain-specific edit feature만 구현한다**

`UpdateUserField`는 `name | memo`, draft, mutation pending/error만 소유한다. 새 generic editable-field framework는 만들지 않는다. icon-only button은 `이름 수정`, `수정 완료`, `수정 취소`처럼 field가 포함된 accessible label을 가진다.

- [ ] **Step 3: query cache를 success response로만 교체한다**

```ts
onSuccess: (user) => {
  queryClient.setQueryData(userKeys.all, user);
  setEditingField(null);
}
```

`onMutate`, rollback snapshot과 optimistic render는 사용하지 않는다. pending 동안 현재 행 action만 잠근다.

- [ ] **Step 4: 검증하고 commit한다**

```bash
pnpm vitest run src/features/update-user src/widgets/user-profile/user-profile.test.tsx
pnpm verify quick
git add src/features/update-user src/widgets/user-profile src/pages/user TODO.md
git commit -m "feat(user): 회원정보 필드별 수정 기능 추가"
```

---

### Task 6: `USER-CRUD-DELETE-01` 비밀번호 확인 탈퇴와 session 정리를 구현한다

**Files:** `src/features/delete-user/**`, `src/pages/user/index.tsx`, matching tests, `src/app/auth/auth-provider.tsx`, its test only if a proven API gap exists

- [ ] **Step 1: destructive path RED를 작성한다**

dialog test는 현재 비밀번호 required, cancel, pending 중 중복 submit 방지, wrong-password 400 후 modal/profile/session 유지, 200 뒤 cache 제거와 `/sign-in` 이동을 검증한다. 기존 `AuthController.terminate(expectedSnapshot)`로 충분한지 caller를 모두 확인한다.

```bash
rg -n 'terminate\(|AuthController|queryClient.clear|removeQueries' src
pnpm vitest run src/features/delete-user src/app/auth/auth-provider.test.tsx
```

Expected RED: delete-user feature가 없다. 기존 auth API가 충분하면 auth-provider production code는 변경하지 않는다.

- [ ] **Step 2: 기존 AlertDialog와 auth termination을 조합한다**

profile 하단 danger area의 `회원 탈퇴` 버튼이 modal을 연다. 200 success 후 현재 auth snapshot으로 기존 `AuthController.terminate`를 호출한다. 이 API가 이미 user/task/dashboard query roots와 access token을 제거하므로 별도 cache-clear helper를 추가하지 않고 `/sign-in`, `{ replace: true }`로 이동한다. 400/network/invalid response에서는 modal을 유지하고 성공 side effect를 실행하지 않는다.

- [ ] **Step 3: focused/quick 검증 후 commit한다**

```bash
pnpm vitest run src/features/delete-user src/widgets/user-profile/user-profile.test.tsx src/mocks/fixtures/users.test.ts src/mocks/handlers/user.test.ts
pnpm verify quick
git add src/features/delete-user src/pages/user src/app/auth TODO.md
git commit -m "feat(user): 비밀번호 확인 회원 탈퇴 추가"
```

---

### Task 7: `USER-CRUD-JOURNEY-VERIFY-01` 핵심 E2E와 browser evidence를 완성한다

**Files:** `e2e/user-crud.spec.ts`, `docs/quality/evidence/user-crud.md`, `scripts/verify`, `TODO.md`

- [ ] **Step 1: 두 core case를 작성한다**

positive case는 로그인 link→가입 validation→201→sign-in→profile 조회→name 또는 memo 수정→탈퇴 200→보호 route 접근 불가를 한 독립 fixture에서 증명한다. failure case는 기존 seed user로 wrong-password 탈퇴 400 뒤 profile, Task 목록과 session이 유지되는지 증명한다. 영구 store 삭제 자체를 E2E assertion으로 대체하지 않는다.

정확한 test title은 `@core user CRUD 성공 뒤 보호 경계를 닫는다`와
`@core 잘못된 탈퇴 비밀번호는 상태를 보존한다`로 고정한다.

E2E request interception은 POST body에 confirmation/memo가 없고 PATCH가 one-field인지 확인한다. `scripts/verify`가 고정 Journey/review ID 목록을 검사한다면 user IDs를 추가하고 verifier contract test를 먼저 RED로 만든다.

- [ ] **Step 2: 자동 검증을 순서대로 실행한다**

```bash
pnpm vitest run src/features/sign-up src/features/update-user src/features/delete-user src/mocks/fixtures/users.test.ts src/mocks/handlers/user.test.ts
pnpm verify quick
pnpm playwright test e2e/user-crud.spec.ts
```

- [ ] **Step 3: named browser QA를 기록한다**

agent-browser skill을 읽고 `USER-CRUD-JOURNEY-VERIFY-01`이 포함된 session으로 `390x844`, `1280x720`에서 실제 회원가입/수정/탈퇴와 wrong-password 경로를 실행한다. fresh snapshot, keyboard focus, dialog focus/return, field-error 연결, pending control, console/page/network error, screenshots와 session close를 `docs/quality/evidence/user-crud.md`에 기록한다.

- [ ] **Step 4: full과 diff 검증 후 commit한다**

```bash
pnpm verify full
git diff --check
git add e2e/user-crud.spec.ts docs/quality/evidence/user-crud.md scripts/verify TODO.md
git commit -m "test(user): 사용자 CRUD 여정 근거 추가"
```

---

### Task 8: `USER-CRUD-JOURNEY-REVIEW-01` adversarial review 후 사람 checkpoint를 요청한다

**Files:** all User CRUD diff, `docs/quality/evidence/user-crud.md`, `TODO.md`

- [ ] **Step 1: plan-completion review를 수행한다**

다음 축을 fresh second-pass context로 검토한다: 원본 OpenAPI 무변경, extension/generated/runtime/MSW 일치, credential 비공개, one-field PATCH, 비낙관 UI, unknown POST 무재시도, wrong-password 무변경, user/task cascade store evidence, protected access 종료, responsive/accessibility, dependency/architecture diff.

- [ ] **Step 2: finding을 수정하고 전체 gate를 다시 실행한다**

HIGH/MEDIUM finding은 owning task를 reopen하고 최소 RED→root-cause fix→focused/quick/E2E/browser/full→새 exact target review 순서로 처리한다. review record에는 target SHA, reviewer, checks, findings, corrections, rerun, verdict를 모두 적는다.

- [ ] **Step 3: review evidence를 commit한다**

```bash
git add docs/quality/evidence/user-crud.md TODO.md
git diff --cached --check
git commit -m "docs(user): 사용자 CRUD 독립 검토 근거 기록"
pnpm verify setup
git status --short
```

- [ ] **Step 4: 한 번의 사람 checkpoint를 요청한다**

`JOURNEY-USER-CRUD-01`은 `[ ]`, `BLOCKED`로 유지하고 exact review target, PASS/PASS_WITH_LOW verdict, focused/quick/E2E/browser/full evidence를 연결한다. 사람에게 `docs/quality/evidence/user-crud.md` 검토를 요청하며 AI는 `HUMAN_APPROVED`나 최종 acceptance를 기록하지 않는다.
