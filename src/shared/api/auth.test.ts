import { bearerUserId, resetAuthFixture } from "@/mocks/fixtures/auth";
import { resetUserStore } from "@/mocks/fixtures/users";
import { authHandlers } from "@/mocks/handlers/auth";
import { server } from "@/mocks/server";
import { HttpResponse, http } from "msw";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ApiClient } from "./api-client-context";
import { refreshAccessToken, signIn, signOut } from "./auth";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(async () => {
  server.resetHandlers(...authHandlers);
  resetAuthFixture();
  resetUserStore();
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

  it("authenticates a canonicalized seed email as its stored user", async () => {
    const tokens = await signIn({ email: " USER@EXAMPLE.COM ", password: "Password1" });

    expect(bearerUserId(`Bearer ${tokens.accessToken}`)).toBe("user-1");
  });

  it("rejects a sign-in request with an undocumented property", async () => {
    const response = await fetch(new URL("/api/sign-in", globalThis.location.origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "user@example.com",
        password: "Password1",
        role: "admin",
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorMessage: "이메일 또는 비밀번호가 올바르지 않습니다.",
    });
  });

  it("rejects a token response with an undocumented property", async () => {
    server.use(
      http.post("/api/sign-in", () =>
        HttpResponse.json({ accessToken: "access", refreshToken: "refresh", role: "admin" }),
      ),
    );

    await expect(
      signIn({ email: "user@example.com", password: "Password1" }),
    ).rejects.toMatchObject({ kind: "invalid-response", status: 200 });
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

  it("posts sign-out without a body and accepts only literal success", async () => {
    const capture: { init?: RequestInit } = {};
    const client: ApiClient = {
      request: async (_input, init, guard) => {
        capture.init = init;
        const body: unknown = { success: true };
        if (!guard(body)) throw new Error("invalid fixture");
        return body;
      },
    };

    await expect(signOut(client)).resolves.toEqual({ success: true });
    expect(capture.init).toEqual({ method: "POST", credentials: "include" });
  });

  it("rejects a sign-out response with an undocumented property", async () => {
    const client: ApiClient = {
      request: async (_input, _init, guard) => {
        const body: unknown = { success: true, userId: "user-1" };
        if (!guard(body)) throw new Error("invalid fixture");
        return body;
      },
    };

    await expect(signOut(client)).rejects.toThrow("invalid fixture");
  });
});
