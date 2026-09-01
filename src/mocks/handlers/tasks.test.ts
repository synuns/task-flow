import { resetAuthFixture, startAuthSession } from "@/mocks/fixtures/auth";
import { resetTaskStore } from "@/mocks/fixtures/tasks";
import { server } from "@/mocks/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { taskHandlers } from "./tasks";

let accessToken = "";

async function apiRequest(path: string, method = "GET", token = accessToken) {
  const response = await fetch(new URL(path, globalThis.location.origin), {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: response.status, body: (await response.json()) as unknown };
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  server.resetHandlers(...taskHandlers);
  resetAuthFixture();
  resetTaskStore();
  accessToken = startAuthSession().accessToken;
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
      numOfTask: 3,
      numOfRestTask: 2,
      numOfDoneTask: 1,
    });
    expect(deleted).toEqual({ status: 200, body: { success: true } });
    expect(
      (afterList.body as { data: Array<{ id: string }> }).data.map((task) => task.id),
    ).not.toContain("task-1");
    expect(afterDetail.status).toBe(404);
    expect(afterDashboard.body).toEqual({
      numOfTask: 2,
      numOfRestTask: 1,
      numOfDoneTask: 1,
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

  it("returns two ordered pages and stops at the terminal page", async () => {
    const first = (await apiRequest("/api/task?page=1")).body as {
      data: Array<{ id: string }>;
      hasNext: boolean;
    };
    const second = (await apiRequest("/api/task?page=2")).body as {
      data: Array<{ id: string }>;
      hasNext: boolean;
    };

    expect(first).toMatchObject({ hasNext: true });
    expect(first.data.map((task) => task.id)).toEqual(["task-1", "task-2"]);
    expect(second).toMatchObject({ hasNext: false });
    expect(second.data.map((task) => task.id)).toEqual(["task-3"]);
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

  it("restores every record when the task store resets", async () => {
    await apiRequest("/api/task/task-1", "DELETE");
    resetTaskStore();

    const restoredFirst = (await apiRequest("/api/task?page=1")).body as {
      data: Array<{ id: string }>;
    };
    const restoredSecond = (await apiRequest("/api/task?page=2")).body as {
      data: Array<{ id: string }>;
    };
    const restoredIds = [...restoredFirst.data, ...restoredSecond.data].map((task) => task.id);
    expect(restoredIds).toEqual(["task-1", "task-2", "task-3"]);
    expect((await apiRequest("/api/task/task-1")).status).toBe(200);
    expect((await apiRequest("/api/dashboard")).body).toEqual({
      numOfTask: 3,
      numOfRestTask: 2,
      numOfDoneTask: 1,
    });
  });
});
