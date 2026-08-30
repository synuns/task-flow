export type IssuedTokenPair = { accessToken: string; refreshToken: string };

type AuthFixtureState = {
  sequence: number;
  currentAccessToken: string | null;
  activeRefreshTokens: string[];
};

const fixtureStorageKey = "__kbhc_msw_auth_fixture__";

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

function jwt(kind: "access" | "refresh"): string {
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    id: "user-1",
    exp: Math.floor(Date.now() / 1000) + 300,
    jti: `${kind}-${++state.sequence}`,
  })}.`;
}

function issue(): IssuedTokenPair {
  const pair = { accessToken: jwt("access"), refreshToken: jwt("refresh") };
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

export function startAuthSession(): IssuedTokenPair {
  state.activeRefreshTokens = [];
  return issue();
}

export function rotateRefreshToken(refreshToken: string): IssuedTokenPair | null {
  const index = state.activeRefreshTokens.indexOf(refreshToken);
  if (index === -1) return null;
  state.activeRefreshTokens.splice(index, 1);
  return issue();
}

export function acceptsBearer(header: string | null): boolean {
  return state.currentAccessToken !== null && header === `Bearer ${state.currentAccessToken}`;
}
