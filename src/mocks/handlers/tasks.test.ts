import { resetAuthFixture, startAuthSession } from "@/mocks/fixtures/auth";
import { resetTaskStore } from "@/mocks/fixtures/tasks";
import { testAccountIds } from "@/mocks/fixtures/test-accounts";
import { server } from "@/mocks/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { taskHandlers } from "./tasks";

let accessToken = "";

async function apiRequest(path: string, method = "GET", token = accessToken, body?: unknown) {
  const response = await fetch(new URL(path, globalThis.location.origin), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as unknown };
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  server.resetHandlers(...taskHandlers);
  resetAuthFixture();
  resetTaskStore();
  accessToken = startAuthSession("user-1").accessToken;
});
afterAll(() => server.close());

describe("task handlers", () => {
  it("derives list, detail, and dashboard from one delete transaction", async () => {
    const beforeList = await apiRequest("/api/task?page=1");
    const beforeDashboard = await apiRequest("/api/dashboard");
    const deleted = await apiRequest("/api/task/task-1", "DELETE");
    const afterList = await apiRequest("/api/task?page=1");
    const afterDetail = await apiRequest("/api/task/task-1");
    const afterDashboard = await apiRequest("/api/dashboard");

    expect(beforeList.status).toBe(200);
    expect(beforeDashboard.body).toEqual({
      numOfTask: 30,
      numOfRestTask: 20,
      numOfDoneTask: 10,
    });
    expect(deleted).toEqual({ status: 200, body: { success: true } });
    expect(
      (afterList.body as { data: Array<{ id: string }> }).data.map((task) => task.id),
    ).not.toContain("task-1");
    expect(afterDetail.status).toBe(404);
    expect(afterDashboard.body).toEqual({
      numOfTask: 29,
      numOfRestTask: 19,
      numOfDoneTask: 10,
    });
  });

  it("returns 404 for a repeated delete without treating it as success", async () => {
    expect((await apiRequest("/api/task/task-1", "DELETE")).status).toBe(200);

    await expect(apiRequest("/api/task/task-1", "DELETE")).resolves.toEqual({
      status: 404,
      body: { errorMessage: "할 일을 찾을 수 없습니다." },
    });
  });

  it.each([1, 2])("returns an OpenAPI task page for valid page %i", async (page) => {
    const response = await apiRequest(`/api/task?page=${page}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ data: expect.any(Array), hasNext: expect.any(Boolean) });
  });

  it.each(["", "?page=0", "?page=-1", "?page=1.5", "?page=invalid"])(
    "fails closed without publishing an HTTP response for invalid page query %s",
    async (query) => {
      await expect(apiRequest(`/api/task${query}`)).rejects.toThrow();
    },
  );

  it("returns fifteen ordered pages and stops at the terminal page", async () => {
    const pages = await Promise.all(
      Array.from({ length: 15 }, async (_, index) => {
        const response = await apiRequest(`/api/task?page=${index + 1}`);
        return response.body as { data: Array<{ id: string }>; hasNext: boolean };
      }),
    );

    expect(pages.flatMap((page) => page.data.map((task) => task.id))).toEqual(
      Array.from({ length: 30 }, (_, index) => `task-${index + 1}`),
    );
    expect(pages.slice(0, -1).every((page) => page.hasNext)).toBe(true);
    expect(pages.at(-1)?.hasNext).toBe(false);
  });

  it("never mutates the store for an unauthorized delete", async () => {
    expect(await apiRequest("/api/task/task-1", "DELETE", "wrong-token")).toEqual({
      status: 401,
      body: { errorMessage: "인증이 필요합니다." },
    });

    expect((await apiRequest("/api/task?page=1")).body).toMatchObject({
      data: expect.arrayContaining([expect.objectContaining({ id: "task-1" })]),
    });
  });

  it("hides another user's tasks across list, detail, delete, and dashboard", async () => {
    const otherToken = startAuthSession("user-2").accessToken;

    expect(await apiRequest("/api/task?page=1", "GET", otherToken)).toEqual({
      status: 200,
      body: { data: [], hasNext: false },
    });
    expect((await apiRequest("/api/task/task-1", "GET", otherToken)).status).toBe(404);
    expect(
      (await apiRequest("/api/task/task-1", "PATCH", otherToken, { status: "DONE" })).status,
    ).toBe(404);
    expect((await apiRequest("/api/task/task-1", "DELETE", otherToken)).status).toBe(404);
    expect(await apiRequest("/api/dashboard", "GET", otherToken)).toEqual({
      status: 200,
      body: { numOfTask: 0, numOfRestTask: 0, numOfDoneTask: 0 },
    });
  });

  it("returns an empty list and zero dashboard for the empty-state account", async () => {
    const token = startAuthSession(testAccountIds.empty).accessToken;

    expect(await apiRequest("/api/task?page=1", "GET", token)).toEqual({
      status: 200,
      body: { data: [], hasNext: false },
    });
    expect(await apiRequest("/api/dashboard", "GET", token)).toEqual({
      status: 200,
      body: { numOfTask: 0, numOfRestTask: 0, numOfDoneTask: 0 },
    });
  });

  it("fails every protected task read for the error-state account", async () => {
    const token = startAuthSession(testAccountIds.error).accessToken;

    await expect(apiRequest("/api/dashboard", "GET", token)).rejects.toThrow();
    await expect(apiRequest("/api/task?page=1", "GET", token)).rejects.toThrow();
    await expect(apiRequest("/api/task/task-1", "GET", token)).rejects.toThrow();
  });

  it("restores every record when the task store resets", async () => {
    await apiRequest("/api/task/task-1", "DELETE");
    resetTaskStore();

    const restoredIds = (
      await Promise.all(
        Array.from({ length: 15 }, async (_, index) => {
          const response = await apiRequest(`/api/task?page=${index + 1}`);
          return (response.body as { data: Array<{ id: string }> }).data;
        }),
      )
    ).flatMap((tasks) => tasks.map((task) => task.id));
    expect(restoredIds).toEqual(Array.from({ length: 30 }, (_, index) => `task-${index + 1}`));
    expect((await apiRequest("/api/task/task-1")).status).toBe(200);
    expect((await apiRequest("/api/dashboard")).body).toEqual({
      numOfTask: 30,
      numOfRestTask: 20,
      numOfDoneTask: 10,
    });
  });

  it("creates and updates an owned task through exact request bodies", async () => {
    const created = await apiRequest("/api/task", "POST", accessToken, {
      title: " 새 할 일 ",
    });
    const id = "task-31";

    expect(created).toMatchObject({
      status: 201,
      body: { id: "task-31", title: "새 할 일", memo: "", status: "TODO" },
    });
    expect(
      await apiRequest(`/api/task/${id}`, "PATCH", accessToken, { status: "IN_PROGRESS" }),
    ).toMatchObject({ status: 200, body: { status: "IN_PROGRESS" } });
    expect(await apiRequest(`/api/task/${id}`)).toMatchObject({
      status: 200,
      body: { title: "새 할 일", memo: "", status: "IN_PROGRESS" },
    });
    expect((await apiRequest("/api/dashboard")).body).toEqual({
      numOfTask: 31,
      numOfRestTask: 21,
      numOfDoneTask: 10,
    });
  });

  it("rejects a multi-field task update without mutating the task", async () => {
    expect(
      await apiRequest("/api/task/task-1", "PATCH", accessToken, {
        title: "수정",
        memo: "동시 수정",
      }),
    ).toEqual({ status: 400, body: { errorMessage: "할 일 수정 값이 올바르지 않습니다." } });
    expect(await apiRequest("/api/task/task-1")).toMatchObject({
      status: 200,
      body: { title: "첫 번째 할 일", memo: "삭제 검증 대상", status: "TODO" },
    });
  });
});
