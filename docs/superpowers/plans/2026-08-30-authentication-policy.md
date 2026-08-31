# Authentication Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DEC-AUTH-01`에 승인된 memory access token, refresh cookie, session generation, bounded replay와 router-owned navigation을 구현한다.

**Architecture:** `shared/api`는 app을 import하지 않고 `createAuthenticatedRequest()`에 auth callback을 주입받는다. `AuthProvider`는 QueryClientProvider와 RouterProvider 사이에서 session만 관리하고, RouterProvider 내부 `AuthRouteBoundary`가 보호 route와 안전한 복귀를 담당한다.

**Tech Stack:** React 19.2.8, TypeScript 5.9.3 strict, React Router 7.18.3, TanStack Query 5.102.8, Fetch API, MSW 2.15.0, Vitest 4.1.11, Testing Library 16.3.3

## Global Constraints

- API method, path, status, schema와 security scheme은 `assignment-original/openapi.yaml`을 따른다.
- `DEC-AUTH-01`, `ARCH-01`, `ARCH-02`, `ARCH-03`, `AUTH-API-01` dependency가 실제로 해소된 뒤 실행한다.
- Access token은 memory에만 저장하며 `localStorage`와 `sessionStorage`에 쓰지 않는다.
- Refresh token은 application code가 저장하거나 읽지 않고 MSW의 `token` cookie가 server 동작을 모사한다.
- 원본 보호 요청은 최대 한 번 replay하고 `/api/sign-in`과 `/api/refresh`는 replay하지 않는다.
- 이전 token 또는 이전 session 응답은 현재 auth state와 보호 query cache를 변경하지 않는다.
- 같은 origin의 등록 route만 복귀 위치로 허용하고 외부 URL, `/sign-in`, 미등록 route는 `/`로 대체한다.
- `shared/api`는 `app`, auth context, router를 import하지 않는다.
- AuthProvider는 `useNavigate`를 사용하지 않는다.
- 새 dependency를 추가하지 않는다.
- AI는 `HUMAN_APPROVED`를 기록하지 않는다.

## File Structure

- `src/app/auth/access-token.ts`: JWT payload decode와 expiry 판정.
- `src/app/auth/return-to.ts`: 동일 origin route allowlist.
- `src/app/auth/auth-provider.tsx`: generation, bootstrap, single-flight refresh, terminal transition.
- `src/app/auth/auth-route-boundary.tsx`: router 내부 보호 route와 복귀 이동.
- `src/app/auth/authenticated-api-bridge.tsx`: app auth callback을 shared API client에 주입.
- `src/shared/api/auth.ts`: sign-in/refresh endpoint와 response guard.
- `src/shared/api/authenticated-request.ts`: bearer, 401, late response, bounded replay.
- `src/shared/api/api-client-context.tsx`: auth를 모르는 generic client provider/hook.
- `src/mocks/fixtures/auth.ts`: 결정적 JWT와 refresh token rotation state.
- `src/mocks/handlers/auth.ts`: sign-in/refresh cookie contract handler.
- `src/app/auth/*.test.*`, `src/shared/api/*.test.ts`: unit/integration evidence.

---

### Task 1: Access token과 안전한 복귀 위치

**Requirement IDs:** `AUTH-07`, `NAV-02`, `NAV-03`

**Files:**

- Create: `src/app/auth/access-token.ts`
- Create: `src/app/auth/access-token.test.ts`
- Create: `src/app/auth/return-to.ts`
- Create: `src/app/auth/return-to.test.ts`

**Interfaces:**

- Consumes: browser `atob`, React Router `matchPath`.
- Produces: `readAccessTokenClaims(token): AccessTokenClaims | null`; `mustRefreshAccessToken(token, nowSeconds): boolean`; `safeReturnTo(candidate, origin): string`.

- [ ] **Step 1: JWT와 return target RED tests 작성**

Create `src/app/auth/access-token.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mustRefreshAccessToken, readAccessTokenClaims } from "./access-token";

function token(payload: unknown) {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  return `${encode({ alg: "none" })}.${encode(payload)}.`;
}

describe("access token policy", () => {
  it("reads string id and numeric exp", () => {
    expect(readAccessTokenClaims(token({ id: "user-1", exp: 200 }))).toEqual({ id: "user-1", exp: 200 });
  });

  it.each(["broken", token({ id: 1, exp: 200 }), token({ id: "user-1", exp: "200" })])(
    "rejects malformed claims: %s",
    (value) => expect(readAccessTokenClaims(value)).toBeNull(),
  );

  it("refreshes at expiry and keeps a token before expiry", () => {
    const value = token({ id: "user-1", exp: 200 });
    expect(mustRefreshAccessToken(value, 199)).toBe(false);
    expect(mustRefreshAccessToken(value, 200)).toBe(true);
  });
});
```

Create `src/app/auth/return-to.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./return-to";

const origin = "https://assignment.test";

describe("safeReturnTo", () => {
  it.each(["/", "/task", "/task/task-1", "/user", "/task?page=2#next"])(
    "keeps an allowed internal route: %s",
    (path) => expect(safeReturnTo(path, origin)).toBe(path),
  );

  it.each([
    "https://evil.test/task",
    "//evil.test/task",
    "/sign-in",
    "/unknown",
    "/task/a%2Fb",
    "not a URL%",
  ])("falls back to root: %s", (path) => expect(safeReturnTo(path, origin)).toBe("/"));
});
```

- [ ] **Step 2: RED 확인**

Run:

```bash
pnpm vitest run src/app/auth/access-token.test.ts src/app/auth/return-to.test.ts
```

Expected: FAIL because `access-token.ts` and `return-to.ts` do not exist.

- [ ] **Step 3: 최소 policy 구현**

Create `src/app/auth/access-token.ts`:

```ts
export type AccessTokenClaims = { id: string; exp: number };

function decodeBase64Url(value: string): string {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}

export function readAccessTokenClaims(token: string): AccessTokenClaims | null {
  try {
    const payload = JSON.parse(decodeBase64Url(token.split(".")[1] ?? "")) as unknown;
    if (!payload || typeof payload !== "object") return null;
    const claims = payload as Record<string, unknown>;
    return typeof claims.id === "string" && typeof claims.exp === "number"
      ? { id: claims.id, exp: claims.exp }
      : null;
  } catch {
    return null;
  }
}

export function mustRefreshAccessToken(token: string, nowSeconds = Date.now() / 1000): boolean {
  const claims = readAccessTokenClaims(token);
  return claims === null || nowSeconds >= claims.exp;
}
```

Create `src/app/auth/return-to.ts`:

```ts
import { matchPath } from "react-router-dom";

const exactRoutes = ["/", "/task", "/user"] as const;

function isAllowedPath(pathname: string): boolean {
  if (exactRoutes.includes(pathname as (typeof exactRoutes)[number])) return true;
  const match = matchPath({ path: "/task/:id", end: true }, pathname);
  if (!match?.params.id) return false;
  try {
    const id = decodeURIComponent(match.params.id);
    return id.length > 0 && !id.includes("/");
  } catch {
    return false;
  }
}

export function safeReturnTo(candidate: unknown, origin: string): string {
  if (typeof candidate !== "string") return "/";
  try {
    const url = new URL(candidate, origin);
    if (url.origin !== origin || url.pathname === "/sign-in" || !isAllowedPath(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
```

- [ ] **Step 4: GREEN과 commit**

Run:

```bash
pnpm vitest run src/app/auth/access-token.test.ts src/app/auth/return-to.test.ts
git add src/app/auth/access-token.ts src/app/auth/access-token.test.ts src/app/auth/return-to.ts src/app/auth/return-to.test.ts
git commit -m "feat(auth): 토큰 만료와 안전한 복귀 경로 추가"
```

Expected: all tests PASS and one focused commit exists.

---

### Task 2: Refresh endpoint와 MSW cookie fixture

**Requirement IDs:** `AUTH-05`, `AUTH-07`

**Files:**

- Modify: `src/shared/api/auth.ts`
- Create: `src/mocks/fixtures/auth.ts`
- Create: `src/mocks/handlers/auth.ts`
- Create: `src/mocks/handlers/index.ts`
- Modify: `src/mocks/browser.ts`
- Modify: `src/mocks/server.ts`
- Create: `src/shared/api/auth-refresh.test.ts`

**Interfaces:**

- Consumes: `requestJson<T>()`; generated auth schemas internally; existing `signIn()` behavior from `AUTH-API-01`.
- Produces: `AuthTokenPair`; `refreshAccessToken(): Promise<AuthTokenPair>`; `authHandlers`; `resetAuthFixture()`.

- [ ] **Step 1: Cookie rotation RED integration test 작성**

Create `src/shared/api/auth-refresh.test.ts`:

```ts
import { authHandlers } from "@/mocks/handlers/auth";
import { resetAuthFixture } from "@/mocks/fixtures/auth";
import { server } from "@/mocks/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { refreshAccessToken, signIn } from "./auth";

beforeEach(() => {
  resetAuthFixture();
  server.use(...authHandlers);
});
afterEach(() => server.resetHandlers());

describe("refresh cookie contract", () => {
  it("signs in, sends token cookie, and rotates both tokens", async () => {
    const first = await signIn({ email: "user@example.com", password: "Password1" });
    const second = await refreshAccessToken();
    expect(second.accessToken).not.toBe(first.accessToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
  });

  it("returns OpenAPI 401 when the refresh cookie is missing", async () => {
    await expect(refreshAccessToken()).rejects.toMatchObject({ kind: "http", status: 401 });
  });
});
```

- [ ] **Step 2: RED 확인**

Run: `pnpm vitest run src/shared/api/auth-refresh.test.ts`

Expected: FAIL because the fixture, handlers, or `refreshAccessToken` do not exist.

- [ ] **Step 3: Auth response guard와 endpoint 구현**

Make `src/shared/api/auth.ts` export this exact public surface while retaining the already-tested sign-in request body:

```ts
import type { components } from "@/generated/openapi";
import { requestJson } from "./request";

type GeneratedAuthTokenResponse = components["schemas"]["AuthTokenResponse"];
export type AuthTokenPair = { accessToken: string; refreshToken: string };
export type SignInCredentials = { email: string; password: string };

const apiUrl = (path: string) => new URL(path, globalThis.location?.origin ?? "http://localhost");

function isAuthTokenPair(value: unknown): value is GeneratedAuthTokenResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return typeof data.accessToken === "string" && typeof data.refreshToken === "string";
}

export function signIn(credentials: SignInCredentials): Promise<AuthTokenPair> {
  return requestJson(
    apiUrl("/api/sign-in"),
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) },
    isAuthTokenPair,
  );
}

export function refreshAccessToken(): Promise<AuthTokenPair> {
  return requestJson(
    apiUrl("/api/refresh"),
    { method: "POST", credentials: "include" },
    isAuthTokenPair,
  );
}
```

- [ ] **Step 4: Deterministic auth fixture와 handlers 구현**

Create `src/mocks/fixtures/auth.ts`:

```ts
export type IssuedTokenPair = { accessToken: string; refreshToken: string };

let sequence = 0;
let currentAccessToken: string | null = null;
const activeRefreshTokens = new Set<string>();

const encode = (value: unknown) =>
  btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
const jwt = (kind: "access" | "refresh") =>
  `${encode({ alg: "none", typ: "JWT" })}.${encode({
    id: "user-1",
    exp: Math.floor(Date.now() / 1000) + 300,
    jti: `${kind}-${++sequence}`,
  })}.`;

function issue(): IssuedTokenPair {
  const pair = { accessToken: jwt("access"), refreshToken: jwt("refresh") };
  currentAccessToken = pair.accessToken;
  activeRefreshTokens.add(pair.refreshToken);
  return pair;
}

export function resetAuthFixture(): void {
  sequence = 0;
  currentAccessToken = null;
  activeRefreshTokens.clear();
}

export function startAuthSession(): IssuedTokenPair {
  activeRefreshTokens.clear();
  return issue();
}

export function rotateRefreshToken(refreshToken: string): IssuedTokenPair | null {
  if (!activeRefreshTokens.delete(refreshToken)) return null;
  return issue();
}

export function acceptsBearer(header: string | null): boolean {
  return currentAccessToken !== null && header === `Bearer ${currentAccessToken}`;
}
```

Create `src/mocks/handlers/auth.ts`:

```ts
import { http, HttpResponse } from "msw";
import { rotateRefreshToken, startAuthSession } from "../fixtures/auth";

const cookie = (token: string) => `token=${token}; Path=/api/refresh; SameSite=Strict`;
const expiredCookie = "token=; Path=/api/refresh; Max-Age=0; SameSite=Strict";

export const authHandlers = [
  http.post("/api/sign-in", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.email !== "string" || typeof body.password !== "string") {
      return HttpResponse.json({ errorMessage: "로그인 요청이 올바르지 않습니다." }, { status: 400 });
    }
    const pair = startAuthSession();
    return HttpResponse.json(pair, { headers: { "Set-Cookie": cookie(pair.refreshToken) } });
  }),
  http.post("/api/refresh", ({ cookies }) => {
    const pair = cookies.token ? rotateRefreshToken(cookies.token) : null;
    if (!pair) {
      return HttpResponse.json(
        { errorMessage: "인증 정보를 갱신할 수 없습니다." },
        { status: 401, headers: { "Set-Cookie": expiredCookie } },
      );
    }
    return HttpResponse.json(pair, { headers: { "Set-Cookie": cookie(pair.refreshToken) } });
  }),
];
```

Export `handlers = [...authHandlers]` from `src/mocks/handlers/index.ts`; pass `...handlers` to both `setupWorker()` and `setupServer()`.

- [ ] **Step 5: GREEN, quick, commit**

Run:

```bash
pnpm vitest run src/shared/api/auth-refresh.test.ts
./scripts/verify quick
git add src/shared/api/auth.ts src/shared/api/auth-refresh.test.ts src/mocks/fixtures/auth.ts src/mocks/handlers src/mocks/browser.ts src/mocks/server.ts
git commit -m "feat(auth): refresh cookie 계약 구현"
```

Expected: cookie rotation tests and quick verification PASS.

---

### Task 3: 주입형 bearer transport와 bounded replay

**Requirement IDs:** `AUTH-07`

**Files:**

- Create: `src/shared/api/authenticated-request.ts`
- Create: `src/shared/api/authenticated-request.test.ts`
- Create: `src/shared/api/api-client-context.tsx`
- Create: `src/shared/api/api-client-context.test.tsx`

**Interfaces:**

- Consumes: `requestJson<T>()`, `ApiError` four-kind union.
- Produces: `AuthSnapshot`; `AuthCallbacks`; `createAuthenticatedRequest(callbacks)`; `ApiClient`; `ApiClientProvider`; `useApiClient()`.

- [ ] **Step 1: Concurrency RED tests 작성**

Mock `requestJson` with `vi.mock("./request")`, use a mutable `AuthSnapshot`, and
assert this matrix. The test fake reads the `Authorization` header from the
second argument of every `requestJson` call.

| Case | `requestJson` sequence | Snapshot change | Assertions |
| --- | --- | --- | --- |
| expired before send | refresh returns token-b, then 200 | token-a expired | token-a is never sent; refresh 1; header token-b; transmissions 1 |
| late old-token 401 | 401, 200 | token-a → token-b before rejection is observed | headers token-a/token-b; refresh 0; terminal 0; transmissions 2 |
| late old-token 200 | delayed 200 | token-a → token-b before response is observed | rejects `aborted`; refresh 0; terminal 0; transmissions 1 |
| replay 401 | 401, 401 | refresh returns token-b | refresh 1; terminal 1 with token-b; rejects `aborted`; transmissions 2 |
| earlier generation | delayed 401 | generation 1 → 2 | rejects `aborted`; refresh 0; terminal 0; transmissions 1 |
| old-token network result | delayed network error | token-a → token-b | rejects `aborted`; refresh 0; terminal 0; transmissions 1 |
| current non-401 | network error | none | same error propagates; refresh 0; terminal 0; transmissions 1 |

- [ ] **Step 2: RED 확인**

Run: `pnpm vitest run src/shared/api/authenticated-request.test.ts src/shared/api/api-client-context.test.tsx`

Expected: FAIL because both modules do not exist.

- [ ] **Step 3: Auth callback transport 구현**

Create `src/shared/api/authenticated-request.ts` with this public contract:

```ts
import type { ApiError } from "./api-error";
import { requestJson } from "./request";

export type AuthSnapshot = { generation: number; accessToken: string | null };
export type AuthCallbacks = {
  getSnapshot(): AuthSnapshot;
  mustRefresh(snapshot: AuthSnapshot): boolean;
  refresh(expected: AuthSnapshot): Promise<AuthSnapshot>;
  terminate(expected: AuthSnapshot): void;
};

type Guard<T> = (value: unknown) => value is T;
export type AuthenticatedRequest = <T>(
  input: RequestInfo | URL,
  init: RequestInit,
  isSuccess: Guard<T>,
) => Promise<T>;

const aborted = (): ApiError => ({ kind: "aborted", message: "이전 세션 요청이 폐기되었습니다." });
const is401 = (error: unknown): error is ApiError =>
  !!error && typeof error === "object" && (error as Partial<ApiError>).kind === "http" &&
  (error as { status?: number }).status === 401;
const sameSnapshot = (left: AuthSnapshot, right: AuthSnapshot) =>
  left.generation === right.generation && left.accessToken === right.accessToken;

export function createAuthenticatedRequest(auth: AuthCallbacks): AuthenticatedRequest {
  return async function authenticatedRequest<T>(input, init, isSuccess) {
    const refreshCurrent = async (expected: AuthSnapshot): Promise<AuthSnapshot> => {
      try {
        const refreshed = await auth.refresh(expected);
        if (!sameSnapshot(auth.getSnapshot(), refreshed) || !refreshed.accessToken) throw aborted();
        return refreshed;
      } catch (error) {
        if (!sameSnapshot(auth.getSnapshot(), expected)) throw aborted();
        throw error;
      }
    };

    const send = async (snapshot: AuthSnapshot, replayed: boolean): Promise<T> => {
      if (!snapshot.accessToken) throw aborted();
      try {
        const result = await requestJson(
          input,
          { ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), Authorization: `Bearer ${snapshot.accessToken}` } },
          isSuccess,
        );
        if (!sameSnapshot(auth.getSnapshot(), snapshot)) throw aborted();
        return result;
      } catch (error) {
        const current = auth.getSnapshot();
        if (current.generation !== snapshot.generation) throw aborted();
        if (!is401(error)) {
          if (current.accessToken !== snapshot.accessToken) throw aborted();
          throw error;
        }
        if (current.accessToken !== snapshot.accessToken) {
          if (replayed || !current.accessToken) throw aborted();
          return send(current, true);
        }
        if (replayed) {
          auth.terminate(snapshot);
          throw aborted();
        }
        return send(await refreshCurrent(snapshot), true);
      }
    };

    const initial = auth.getSnapshot();
    if (!initial.accessToken) throw aborted();
    return send(auth.mustRefresh(initial) ? await refreshCurrent(initial) : initial, false);
  };
}
```

Create `src/shared/api/api-client-context.tsx`:

```tsx
import { createContext, type PropsWithChildren, useContext } from "react";
import type { AuthenticatedRequest } from "./authenticated-request";

export type ApiClient = { request: AuthenticatedRequest };
const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({ client, children }: PropsWithChildren<{ client: ApiClient }>) {
  return <ApiClientContext value={client}>{children}</ApiClientContext>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error("ApiClientProvider is missing");
  return client;
}
```

- [ ] **Step 4: GREEN, import guard, commit**

Run:

```bash
pnpm vitest run src/shared/api/authenticated-request.test.ts src/shared/api/api-client-context.test.tsx
rg -n "@/app|react-router|useNavigate" src/shared/api
./scripts/verify quick
git add src/shared/api/authenticated-request.ts src/shared/api/authenticated-request.test.ts src/shared/api/api-client-context.tsx src/shared/api/api-client-context.test.tsx
git commit -m "feat(auth): 주입형 bearer replay 경계 추가"
```

Expected: tests PASS and the `rg` command prints no app or router import.

---

### Task 4: AuthProvider와 app composition

**Requirement IDs:** `AUTH-07`

**Files:**

- Create: `src/app/auth/auth-provider.tsx`
- Create: `src/app/auth/auth-provider.test.tsx`
- Create: `src/app/auth/authenticated-api-bridge.tsx`
- Create: `src/app/auth/authenticated-api-bridge.test.tsx`
- Modify: `src/app/index.tsx`

**Interfaces:**

- Consumes: `refreshAccessToken`; `createAuthenticatedRequest`; `ApiClientProvider`; app QueryClient.
- Produces: app-private `useAuth()` with stable `getSnapshot`, `acceptSignIn`, `refresh`, `terminate`, and observable `status`.

- [ ] **Step 1: Provider RED tests 작성**

Use mocked `refreshAccessToken`, a real `QueryClient`, and a context probe
component. Assert this exact matrix:

| Transition | Setup | Expected state/effect |
| --- | --- | --- |
| initial refresh 401 | reject `{kind:"http", status:401}` | one call; `anonymous`; no user error |
| initial network | reject `{kind:"network"}` | `unavailable`; retry action exposed |
| sign-in then terminate | valid tokens and matching snapshot | generation increments twice; protected roots removed |
| concurrent refresh | two calls with same snapshot and one deferred endpoint promise | endpoint called once; both resolve same snapshot |
| newer sign-in | refresh pending, then `acceptSignIn` | late refresh discarded; new token retained |
| stale terminate | expected generation differs | state and all cache unchanged |
| bridge stability | accept a rotated token | identical `ApiClient` object before/after |

- [ ] **Step 2: RED 확인**

Run: `pnpm vitest run src/app/auth/auth-provider.test.tsx src/app/auth/authenticated-api-bridge.test.tsx`

Expected: FAIL because provider and bridge do not exist.

- [ ] **Step 3: Provider state machine 구현**

Use this exact public shape in `src/app/auth/auth-provider.tsx`:

```ts
export type AuthStatus =
  | { kind: "initializing" }
  | { kind: "anonymous" }
  | { kind: "unavailable"; message: string }
  | { kind: "authenticated"; generation: number; accessToken: string; userId: string };

export type AuthController = {
  status: AuthStatus;
  getSnapshot(): AuthSnapshot;
  acceptSignIn(tokens: AuthTokenPair): void;
  refresh(expected: AuthSnapshot): Promise<AuthSnapshot>;
  terminate(expected: AuthSnapshot): void;
  retryBootstrap(): Promise<void>;
};
```

Implementation rules inside the provider:

```ts
const protectedRoots = new Set(["dashboard", "tasks", "task", "user"]);
queryClient.removeQueries({ predicate: (query) => protectedRoots.has(String(query.queryKey[0])) });
```

Keep state in both React state and a ref so `getSnapshot()` is synchronous. Guard the bootstrap effect with `startedRef`. Store one in-flight `{ generation, accessToken, promise }` refresh record in a ref; reuse it only when both expected fields match. `acceptSignIn()` and current `terminate()` increment generation. A stale `terminate()` is a no-op. Refresh 400/401 calls current `terminate()`; network and invalid-response propagate without terminating.

- [ ] **Step 4: Stable bridge와 provider order 구현**

Create `src/app/auth/authenticated-api-bridge.tsx`:

```tsx
import { ApiClientProvider } from "@/shared/api/api-client-context";
import { createAuthenticatedRequest } from "@/shared/api/authenticated-request";
import { type PropsWithChildren, useMemo } from "react";
import { mustRefreshAccessToken } from "./access-token";
import { useAuth } from "./auth-provider";

export function AuthenticatedApiBridge({ children }: PropsWithChildren) {
  const auth = useAuth();
  const client = useMemo(
    () => ({
      request: createAuthenticatedRequest({
        getSnapshot: auth.getSnapshot,
        mustRefresh: (snapshot) =>
          snapshot.accessToken === null || mustRefreshAccessToken(snapshot.accessToken),
        refresh: auth.refresh,
        terminate: auth.terminate,
      }),
    }),
    [auth.getSnapshot, auth.refresh, auth.terminate],
  );
  return <ApiClientProvider client={client}>{children}</ApiClientProvider>;
}
```

Compose `src/app/index.tsx` in this order:

```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider queryClient={queryClient}>
    <AuthenticatedApiBridge>
      <RouterProvider router={appRouter} />
    </AuthenticatedApiBridge>
  </AuthProvider>
</QueryClientProvider>
```

- [ ] **Step 5: GREEN and commit**

Run:

```bash
pnpm vitest run src/app/auth/auth-provider.test.tsx src/app/auth/authenticated-api-bridge.test.tsx
rg -n "useNavigate" src/app/auth/auth-provider.tsx src/app/auth/authenticated-api-bridge.tsx
./scripts/verify quick
git add src/app/auth src/app/index.tsx
git commit -m "feat(auth): session provider와 API bridge 구성"
```

Expected: tests PASS and `rg` prints no `useNavigate` usage.

---

### Task 5: Router-owned auth transition

**Requirement IDs:** `NAV-02`, `NAV-03`, `AUTH-07`

**Files:**

- Create: `src/app/auth/auth-route-boundary.tsx`
- Create: `src/app/auth/auth-route-boundary.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/widgets/app-shell/index.tsx`
- Modify: `src/pages/sign-in/index.tsx`
- Modify: existing sign-in feature public props from `AUTH-API-01`
- Create: `e2e/auth-entry.spec.ts`

**Interfaces:**

- Consumes: `AuthController.status`, `acceptSignIn`, `safeReturnTo`.
- Produces: router-internal auth boundary; callback-prop sign-in completion; mutually exclusive sign-in/profile navigation action.

- [ ] **Step 1: Route transition RED tests 작성**

Render `createMemoryRouter()` with an injected fake auth controller and assert
this exact matrix:

| Auth state / entry | Expected router result |
| --- | --- |
| initializing / `/task` | status text; task page absent |
| anonymous / `/task/task-1` | `/sign-in`; state returnTo `/task/task-1` |
| authenticated / `/sign-in` with external returnTo | `/` |
| authenticated / `/sign-in` with internal returnTo | preserved internal route |
| terminal transition while `/user` | `/sign-in`; returnTo `/user` |
| anonymous shell | sign-in visible; profile absent |
| authenticated shell | profile visible; sign-in absent |

- [ ] **Step 2: RED 확인**

Run: `pnpm vitest run src/app/auth/auth-route-boundary.test.tsx src/app/router.test.tsx`

Expected: FAIL because the boundary and auth-aware route composition do not exist.

- [ ] **Step 3: Router boundary 구현**

Create `src/app/auth/auth-route-boundary.tsx` with this decision order:

```tsx
if (status.kind === "initializing") return <p role="status">인증 상태를 확인하고 있습니다.</p>;
if (status.kind === "unavailable") return <button onClick={() => void retryBootstrap()}>다시 확인</button>;
if (status.kind === "anonymous" && protectedRoute) {
  return <Navigate replace state={{ returnTo: currentInternalLocation }} to="/sign-in" />;
}
if (status.kind === "authenticated" && pathname === "/sign-in") {
  return <Navigate replace to={safeReturnTo(location.state?.returnTo, window.location.origin)} />;
}
return <Outlet />;
```

Build `currentInternalLocation` from `pathname + search + hash`; determine `protectedRoute` from the same four allowlisted patterns as `safeReturnTo`. Keep all calls to `Navigate`, `useLocation`, and route matching inside this router-owned module.

Update `AppShell` to accept this public prop instead of importing app auth:

```tsx
import { CircleUserRound, LayoutDashboard, ListTodo, LogIn } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export type AuthAction = { kind: "sign-in"; to: "/sign-in" } | { kind: "profile"; to: "/user" };
export function AppShell({ authAction }: { authAction: AuthAction }) {
  const AuthIcon = authAction.kind === "sign-in" ? LogIn : CircleUserRound;
  const authLabel = authAction.kind === "sign-in" ? "로그인" : "회원정보";
  return (
    <>
      <header>
        <nav aria-label="주요 메뉴">
          <NavLink end to="/"><LayoutDashboard aria-hidden="true" />대시보드</NavLink>
          <NavLink to="/task"><ListTodo aria-hidden="true" />할 일</NavLink>
          <NavLink to={authAction.to}><AuthIcon aria-hidden="true" />{authLabel}</NavLink>
        </nav>
      </header>
      <main><Outlet /></main>
    </>
  );
}
```

App route elements read `useAuth()` in app-local wrappers, pass `authAction` to `AppShell`, and pass `acceptSignIn` to the sign-in page's `onAuthenticated(tokens)` public prop.

Create one `@core @auth` browser test in `e2e/auth-entry.spec.ts`. Start at
`/task/task-1` with a fresh browser context, assert bootstrap refresh 401 routes
to `/sign-in` with no protected content, sign in through the visible form, and
assert return to `/task/task-1`. Reload that URL, assert the refresh cookie
restores the session before protected content renders, and capture console,
page error, refresh request count, and a screenshot. Keep external/malformed
return targets and replay races at integration level.

- [ ] **Step 4: GREEN, targeted browser evidence, commit**

Run:

```bash
pnpm vitest run src/app/auth/auth-route-boundary.test.tsx src/app/router.test.tsx
./scripts/verify quick
pnpm exec playwright test --grep @auth
git add src/app/auth/auth-route-boundary.tsx src/app/auth/auth-route-boundary.test.tsx src/app/router.tsx src/widgets/app-shell src/pages/sign-in e2e/auth-entry.spec.ts
git commit -m "feat(auth): 보호 route와 인증 navigation 연결"
```

Expected: integration tests PASS; signed-out direct entry, safe return, sign-in/profile exclusivity pass without console errors.

---

### Task 6: AUTH-STATE/NAV evidence와 checkpoint 준비

**Requirement IDs:** `AUTH-07`, `NAV-02`, `NAV-03`

**Files:**

- Modify: `TODO.md`
- Modify: `docs/quality/requirements.md`
- Create or Modify: `docs/quality/evidence/auth-entry.md`

**Interfaces:**

- Consumes: all previous task tests and browser records.
- Produces: reproducible evidence for `AUTH-STATE-01`, `AUTH-NAV-01`, and `auth-entry` review input.

- [ ] **Step 1: Focused verification**

Run:

```bash
pnpm vitest run src/app/auth src/shared/api/auth-refresh.test.ts src/shared/api/authenticated-request.test.ts
./scripts/verify quick
pnpm exec playwright test --grep @auth
git diff --check
```

Expected: all focused tests, quick gate, and auth browser test PASS; repository fingerprint remains unchanged by verification.

- [ ] **Step 2: Evidence record and adversarial checklist**

Record the exact commit, route, viewport, preconditions, actions, expected/actual, console/network, trace, failure class, correction, and rerun verdict. Explicitly include bearer header, refresh request count, late 401 token sequence, replay 401 terminal result, stale generation no-op, cookie bootstrap, and safe return allowlist.

- [ ] **Step 3: TODO update and commit**

Set `AUTH-STATE-01` and `AUTH-NAV-01` to `AI_VERIFIED` only when their cited commands pass. Leave `JOURNEY-AUTH-01` short of `HUMAN_APPROVED` and request its human checkpoint after lightweight adversarial findings are resolved.

```bash
git add TODO.md docs/quality/requirements.md docs/quality/evidence/auth-entry.md
git commit -m "docs(auth): 인증 정책 검증 근거 기록"
```
