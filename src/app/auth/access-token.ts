type AccessTokenClaims = { id: string; exp: number };

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
