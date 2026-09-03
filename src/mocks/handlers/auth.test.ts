import { resetAuthFixture, startAuthSession } from "@/mocks/fixtures/auth";
import { server } from "@/mocks/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authHandlers } from "./auth";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  resetAuthFixture();
  server.resetHandlers(...authHandlers);
});
afterAll(() => server.close());

describe("auth handlers", () => {
  it("revokes the bearer session and expires its refresh cookie", async () => {
    const pair = startAuthSession("user-1");
    const signedOut = await fetch(new URL("/api/sign-out", location.origin), {
      method: "POST",
      headers: { Authorization: `Bearer ${pair.accessToken}` },
    });
    const refreshed = await fetch(new URL("/api/refresh", location.origin), {
      method: "POST",
      headers: { Cookie: `token=${pair.refreshToken}` },
    });

    await expect(signedOut.json()).resolves.toEqual({ success: true });
    expect(signedOut.headers.get("set-cookie")).toContain("Path=/api/refresh");
    expect(signedOut.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(refreshed.status).toBe(401);
  });

  it("rejects an unauthorized sign-out without revoking the active session", async () => {
    const pair = startAuthSession("user-1");
    const rejected = await fetch(new URL("/api/sign-out", location.origin), { method: "POST" });
    const stillAuthorized = await fetch(new URL("/api/sign-out", location.origin), {
      method: "POST",
      headers: { Authorization: `Bearer ${pair.accessToken}` },
    });

    expect(rejected.status).toBe(401);
    expect(stillAuthorized.status).toBe(200);
  });
});
