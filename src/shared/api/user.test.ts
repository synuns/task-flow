import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "./api-client-context";
import { createUser, deleteUser, getUser, updateUser } from "./user";

type Capture = { url?: string; init?: RequestInit };
const user = { email: "user@example.com", name: "김담당", memo: "오늘도 차근차근" };

function clientFor(body: unknown, capture: Capture): ApiClient {
  return {
    request: async <T>(
      input: RequestInfo | URL,
      init: RequestInit,
      isSuccess: (value: unknown) => value is T,
    ) => {
      capture.url = String(input);
      capture.init = init;
      if (!isSuccess(body)) {
        throw { kind: "invalid-response", status: 200, message: "invalid" };
      }
      return body;
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("user API", () => {
  it("posts exact public signup fields and accepts a 201 User response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(user, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createUser({ email: "new@example.com", password: "Password1", name: "새 사용자" }),
    ).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/user", globalThis.location.origin),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          password: "Password1",
          name: "새 사용자",
        }),
      }),
    );
  });

  it("uses GET, one-field PATCH, and password-body DELETE for protected requests", async () => {
    const getCapture: Capture = {};
    const patchCapture: Capture = {};
    const deleteCapture: Capture = {};

    await expect(getUser(clientFor(user, getCapture))).resolves.toEqual(user);
    await expect(updateUser(clientFor(user, patchCapture), { name: "새 이름" })).resolves.toEqual(
      user,
    );
    await expect(
      deleteUser(clientFor({ success: true }, deleteCapture), "Password1"),
    ).resolves.toEqual({ success: true });

    expect(getCapture).toMatchObject({
      url: `${globalThis.location.origin}/api/user`,
      init: { method: "GET" },
    });
    expect(patchCapture).toMatchObject({
      url: `${globalThis.location.origin}/api/user`,
      init: { method: "PATCH", body: JSON.stringify({ name: "새 이름" }) },
    });
    expect(deleteCapture).toMatchObject({
      url: `${globalThis.location.origin}/api/user`,
      init: { method: "DELETE", body: JSON.stringify({ password: "Password1" }) },
    });
  });

  it.each([
    ["missing User field", { email: "user@example.com", name: "김담당" }],
    ["extra User field", { ...user, password: "Password1" }],
    ["invalid email", { ...user, email: "not-an-email" }],
    ["email over 254 characters", { ...user, email: `${"a".repeat(243)}@example.com` }],
    ["name over 50 characters", { ...user, name: "이".repeat(51) }],
    ["memo over 500 characters", { ...user, memo: "메".repeat(501) }],
  ])("rejects an invalid %s", async (_case, body) => {
    await expect(getUser(clientFor(body, {}))).rejects.toMatchObject({
      kind: "invalid-response",
    });
  });

  it("rejects a non-literal delete success response", async () => {
    await expect(deleteUser(clientFor({ success: false }, {}), "Password1")).rejects.toMatchObject({
      kind: "invalid-response",
    });
  });

  it("keeps a fieldless 400 as a form-level HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ errorMessage: "가입 정보를 확인해주세요." }, { status: 400 }),
        ),
    );

    await expect(
      createUser({ email: "new@example.com", password: "Password1", name: "새 사용자" }),
    ).rejects.toEqual({
      kind: "http",
      status: 400,
      message: "가입 정보를 확인해주세요.",
    });
  });
});
