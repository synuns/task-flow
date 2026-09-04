type IssuedTokenPair = { accessToken: string; refreshToken: string };

type AuthFixtureState = {
  sequence: number;
  currentAccessToken: string | null;
  activeRefreshTokens: string[];
};

const fixtureStorageKey = "__taskflow_msw_auth_fixture__";

function emptyState(): AuthFixtureState {
  return { sequence: 0, currentAccessToken: null, activeRefreshTokens: [] };
}

function loadState(): AuthFixtureState {
  try {
    const raw = globalThis.sessionStorage?.getItem(fixtureStorageKey);
    if (!raw) return emptyState();

    const parsed = JSON.parse(raw) as Partial<AuthFixtureState>;
    if (
      typeof parsed.sequence !== "number" ||
      !Number.isInteger(parsed.sequence) ||
      parsed.sequence < 0 ||
      !(parsed.currentAccessToken === null || typeof parsed.currentAccessToken === "string") ||
      !Array.isArray(parsed.activeRefreshTokens) ||
      !parsed.activeRefreshTokens.every((token) => typeof token === "string")
    ) {
      return emptyState();
    }

    return parsed as AuthFixtureState;
  } catch {
    return emptyState();
  }
}

let state = loadState();

function persistState(): void {
  try {
    globalThis.sessionStorage?.setItem(fixtureStorageKey, JSON.stringify(state));
  } catch {
    // A storage-disabled browser can still exercise the fixture until the next reload.
  }
}

function encode(value: unknown): string {
  return btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function jwt(kind: "access" | "refresh", userId: string): string {
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    id: userId,
    exp: Math.floor(Date.now() / 1000) + 300,
    jti: `${kind}-${++state.sequence}`,
  })}.`;
}

function tokenUserId(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as {
      id?: unknown;
    };
    return typeof claims.id === "string" ? claims.id : null;
  } catch {
    return null;
  }
}

function issue(userId: string): IssuedTokenPair {
  const pair = {
    accessToken: jwt("access", userId),
    refreshToken: jwt("refresh", userId),
  };
  state.currentAccessToken = pair.accessToken;
  state.activeRefreshTokens.push(pair.refreshToken);
  persistState();
  return pair;
}

export function resetAuthFixture(): void {
  state = emptyState();
  try {
    globalThis.sessionStorage?.removeItem(fixtureStorageKey);
  } catch {
    // Keep the in-memory reset when storage is unavailable.
  }
}

export function startAuthSession(userId: string): IssuedTokenPair {
  state.activeRefreshTokens = [];
  return issue(userId);
}

export function rotateRefreshToken(refreshToken: string): IssuedTokenPair | null {
  const index = state.activeRefreshTokens.indexOf(refreshToken);
  if (index === -1) return null;
  const userId = tokenUserId(refreshToken);
  if (!userId) return null;
  state.activeRefreshTokens.splice(index, 1);
  return issue(userId);
}

export function bearerUserId(header: string | null): string | null {
  if (state.currentAccessToken === null || header !== `Bearer ${state.currentAccessToken}`) {
    return null;
  }
  return tokenUserId(state.currentAccessToken);
}

export function revokeAuthSession(userId: string): boolean {
  if (state.currentAccessToken === null || tokenUserId(state.currentAccessToken) !== userId) {
    return false;
  }
  state.currentAccessToken = null;
  state.activeRefreshTokens = [];
  persistState();
  return true;
}
