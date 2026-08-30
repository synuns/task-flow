export type IssuedTokenPair = { accessToken: string; refreshToken: string };

let sequence = 0;
let currentAccessToken: string | null = null;
const activeRefreshTokens = new Set<string>();

function encode(value: unknown): string {
  return btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function jwt(kind: "access" | "refresh"): string {
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    id: "user-1",
    exp: Math.floor(Date.now() / 1000) + 300,
    jti: `${kind}-${++sequence}`,
  })}.`;
}

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
