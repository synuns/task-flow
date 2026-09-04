import { resetAuthFixture, startAuthSession } from "@/mocks/fixtures/auth";
import { resetTaskStore } from "@/mocks/fixtures/tasks";
import { testAccountIds } from "@/mocks/fixtures/test-accounts";
import { resetUserStore } from "@/mocks/fixtures/users";
import { server } from "@/mocks/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { userHandlers } from "./user";

async function apiRequest(path: string, init?: RequestInit) {
  const response = await fetch(new URL(path, globalThis.location.origin), init);
  return { response, body: (await response.json()) as unknown };
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  server.resetHandlers(...userHandlers);
  resetAuthFixture();
  resetUserStore();
  resetTaskStore();
});
afterAll(() => server.close());

describe("user handlers", () => {
  it("creates a canonical user and reserves 409 for duplicate email", async () => {
    const body = { email: " New@Example.com ", password: "Password1", name: " 새 사용자 " };
    const created = await apiRequest("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const duplicate = await apiRequest("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, email: "NEW@example.com" }),
    });

    expect(created.response.status).toBe(201);
    expect(created.body).toEqual({ email: "new@example.com", name: "새 사용자", memo: "" });
    expect(duplicate.response.status).toBe(409);
    expect(duplicate.body).toEqual({ errorMessage: "이미 사용 중인 이메일입니다." });
  });

  it("gets and updates exactly one field for the bearer user", async () => {
    const token = startAuthSession("user-1").accessToken;
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const before = await apiRequest("/api/user", { headers });
    const updated = await apiRequest("/api/user", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ memo: "수정한 메모" }),
    });
    const invalid = await apiRequest("/api/user", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name: "이름", memo: "메모" }),
    });

    expect(before.body).toEqual({
      email: "user@example.com",
      name: "김담당",
      memo: "오늘도 차근차근",
    });
    expect(updated.body).toEqual({
      email: "user@example.com",
      name: "김담당",
      memo: "수정한 메모",
    });
    expect(invalid.response.status).toBe(400);
  });

  it("returns the empty-state test account profile", async () => {
    const token = startAuthSession(testAccountIds.empty).accessToken;
    const result = await apiRequest("/api/user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(result.response.status).toBe(200);
    expect(result.body).toEqual({
      email: "empty@example.com",
      name: "빈 목록 사용자",
      memo: "등록된 할 일이 없는 계정",
    });
  });

  it("fails the protected profile read for the error-state account", async () => {
    const token = startAuthSession(testAccountIds.error).accessToken;

    await expect(
      apiRequest("/api/user", { headers: { Authorization: `Bearer ${token}` } }),
    ).rejects.toThrow();
  });

  it("preserves the account on wrong password and revokes it only after 200", async () => {
    const token = startAuthSession("user-1").accessToken;
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const wrong = await apiRequest("/api/user", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ password: "Wrong123" }),
    });
    const stillPresent = await apiRequest("/api/user", { headers });
    const deleted = await apiRequest("/api/user", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ password: "Password1" }),
    });
    const revoked = await apiRequest("/api/user", { headers });

    expect(wrong.response.status).toBe(400);
    expect(stillPresent.response.status).toBe(200);
    expect(deleted.body).toEqual({ success: true });
    expect(deleted.response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(revoked.response.status).toBe(401);
  });

  it("rejects malformed and unauthorized requests without mutation", async () => {
    const malformed = await apiRequest("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid", password: "Password!", name: "" }),
    });
    const unauthorized = await apiRequest("/api/user");

    expect(malformed.response.status).toBe(400);
    expect(malformed.body).toEqual({ errorMessage: "가입 정보를 확인해주세요." });
    expect(unauthorized.response.status).toBe(401);
  });
});
