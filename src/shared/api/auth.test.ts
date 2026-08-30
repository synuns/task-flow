import { resetAuthFixture } from "@/mocks/fixtures/auth";
import { authHandlers } from "@/mocks/handlers/auth";
import { server } from "@/mocks/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { refreshAccessToken, signIn } from "./auth";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(async () => {
  server.resetHandlers(...authHandlers);
  resetAuthFixture();
  await fetch(new URL("/api/refresh", globalThis.location.origin), {
    method: "POST",
    credentials: "include",
  });
  resetAuthFixture();
});
afterAll(() => server.close());

describe("auth API", () => {
  it("posts exact credentials and returns the OpenAPI token pair", async () => {
    const tokens = await signIn({ email: "user@example.com", password: "Password1" });

    expect(tokens.accessToken.split(".")).toHaveLength(3);
    expect(tokens.refreshToken.split(".")).toHaveLength(3);
  });

  it("uses the response cookie to rotate both tokens", async () => {
    const first = await signIn({ email: "user@example.com", password: "Password1" });
    const second = await refreshAccessToken();

    expect(second.accessToken).not.toBe(first.accessToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
  });

  it("normalizes a missing refresh cookie as the OpenAPI 401 response", async () => {
    await expect(refreshAccessToken()).rejects.toMatchObject({
      kind: "http",
      status: 401,
      message: "인증 정보를 갱신할 수 없습니다.",
    });
  });
});
