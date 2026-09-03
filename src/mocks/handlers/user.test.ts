import { resetAuthFixture, startAuthSession } from "@/mocks/fixtures/auth";
import { server } from "@/mocks/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { userHandlers } from "./user";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  server.resetHandlers(...userHandlers);
  resetAuthFixture();
});
afterAll(() => server.close());

describe("user handlers", () => {
  it("returns the OpenAPI profile for the current bearer", async () => {
    const token = startAuthSession("user-1").accessToken;
    const response = await fetch(new URL("/api/user", globalThis.location.origin), {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      name: "김담당",
      memo: "오늘도 차근차근",
    });
  });

  it("rejects a request without the current bearer", async () => {
    const response = await fetch(new URL("/api/user", globalThis.location.origin));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ errorMessage: "인증이 필요합니다." });
  });
});
