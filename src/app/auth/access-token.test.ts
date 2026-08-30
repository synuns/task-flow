import { describe, expect, it } from "vitest";
import { mustRefreshAccessToken, readAccessTokenClaims } from "./access-token";

function token(payload: unknown): string {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  return `${encode({ alg: "none" })}.${encode(payload)}.`;
}

describe("access token policy", () => {
  it("reads string id and numeric exp", () => {
    expect(readAccessTokenClaims(token({ id: "user-1", exp: 200 }))).toEqual({
      id: "user-1",
      exp: 200,
    });
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
