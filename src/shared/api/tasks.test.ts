import { describe, expect, it } from "vitest";
import type { ApiClient } from "./api-client-context";
import { createTask, deleteTask, getTaskDetail, getTasks, updateTask } from "./tasks";

type Capture = { url?: string; init?: RequestInit };

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

describe("tasks API", () => {
  it("requests the encoded task ID and accepts the OpenAPI detail shape", async () => {
    const capture: { url?: string; method?: string } = {};
    const body = {
      title: "첫 번째 할 일",
      memo: "삭제 검증 대상",
      status: "IN_PROGRESS",
      registerDatetime: "2026-08-30T09:00:00.000Z",
    };

    await expect(getTaskDetail(clientFor(body, capture), "task/A")).resolves.toEqual(body);
    expect(capture).toEqual({
      url: `${globalThis.location.origin}/api/task/task%2FA`,
      init: { method: "GET", signal: undefined },
    });
  });

  it("rejects an otherwise valid task detail with an invalid date-time", async () => {
    const capture: { url?: string; method?: string } = {};

    await expect(
      getTaskDetail(
        clientFor(
          { title: "할 일", memo: "메모", status: "TODO", registerDatetime: "not-a-date" },
          capture,
        ),
        "task-1",
      ),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("requests the exact page and accepts the OpenAPI task-list shape", async () => {
    const capture: { url?: string; method?: string } = {};
    const body = {
      data: [
        {
          id: "task-1",
          title: "첫 번째 할 일",
          memo: "삭제 검증 대상",
          status: "IN_PROGRESS",
        },
      ],
      hasNext: true,
    };

    await expect(getTasks(clientFor(body, capture), 1)).resolves.toEqual(body);
    expect(capture).toEqual({
      url: `${globalThis.location.origin}/api/task?page=1`,
      init: { method: "GET", signal: undefined },
    });
  });

  it("rejects a task page with an unknown status", async () => {
    const capture: { url?: string; method?: string } = {};
    const body = {
      data: [{ id: "task-1", title: "할 일", memo: "메모", status: "UNKNOWN" }],
      hasNext: false,
    };

    await expect(getTasks(clientFor(body, capture), 1)).rejects.toMatchObject({
      kind: "invalid-response",
    });
  });

  it.each([
    ["empty title", { id: "task-1", title: "", memo: "메모", status: "TODO" }],
    [
      "title over 100 characters",
      { id: "task-1", title: "할".repeat(101), memo: "메모", status: "TODO" },
    ],
    [
      "memo over 500 characters",
      { id: "task-1", title: "할 일", memo: "메".repeat(501), status: "TODO" },
    ],
  ])("rejects a task-list item with %s", async (_case, item) => {
    await expect(
      getTasks(clientFor({ data: [item], hasNext: false }, {}), 1),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it.each([
    [
      "top-level",
      {
        data: [],
        hasNext: false,
        total: 0,
      },
    ],
    [
      "nested item",
      {
        data: [
          {
            id: "task-1",
            title: "할 일",
            memo: "메모",
            status: "TODO",
            registerDatetime: "2026-08-30T09:00:00.000Z",
          },
        ],
        hasNext: false,
      },
    ],
  ])("rejects an OpenAPI task-list %s undocumented property", async (_, body) => {
    const capture: { url?: string; method?: string } = {};

    await expect(getTasks(clientFor(body, capture), 1)).rejects.toMatchObject({
      kind: "invalid-response",
    });
  });

  it("rejects a task-detail response with an undocumented property", async () => {
    const capture: { url?: string; method?: string } = {};

    await expect(
      getTaskDetail(
        clientFor(
          {
            title: "할 일",
            memo: "메모",
            status: "TODO",
            registerDatetime: "2026-08-30T09:00:00.000Z",
            id: "task-1",
          },
          capture,
        ),
        "task-1",
      ),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("rejects a task detail without a date-time offset", async () => {
    await expect(
      getTaskDetail(
        clientFor(
          {
            title: "할 일",
            memo: "메모",
            status: "TODO",
            registerDatetime: "2026-08-30T09:00:00",
          },
          {},
        ),
        "task-1",
      ),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("rejects a created task whose title exceeds the response contract", async () => {
    await expect(
      createTask(
        clientFor(
          {
            id: "task-1",
            title: "할".repeat(101),
            memo: "",
            status: "TODO",
            registerDatetime: "2026-08-30T09:00:00.000Z",
          },
          {},
        ),
        { title: "새 할 일" },
      ),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("rejects a delete response with an undocumented property", async () => {
    const capture: { url?: string; method?: string } = {};

    await expect(
      deleteTask(clientFor({ success: true, deletedId: "task-1" }, capture), "task-1"),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("posts creation fields and patches exactly one task field", async () => {
    const created = {
      id: "task-4",
      title: "새 할 일",
      memo: "",
      status: "TODO",
      registerDatetime: "2026-09-03T10:00:00.000Z",
    } as const;
    const updated = {
      title: created.title,
      memo: created.memo,
      status: "IN_PROGRESS",
      registerDatetime: created.registerDatetime,
    } as const;
    const createCapture: Capture = {};
    const updateCapture: Capture = {};

    await expect(
      createTask(clientFor(created, createCapture), { title: "새 할 일" }),
    ).resolves.toEqual(created);
    await expect(
      updateTask(clientFor(updated, updateCapture), "task/A", { status: "IN_PROGRESS" }),
    ).resolves.toEqual(updated);
    expect(createCapture).toMatchObject({
      url: `${globalThis.location.origin}/api/task`,
      init: { method: "POST", body: JSON.stringify({ title: "새 할 일" }) },
    });
    expect(updateCapture).toMatchObject({
      url: `${globalThis.location.origin}/api/task/task%2FA`,
      init: { method: "PATCH", body: JSON.stringify({ status: "IN_PROGRESS" }) },
    });
  });

  it.each([
    [
      "create",
      (client: ApiClient) => createTask(client, { title: "새 할 일" }),
      { title: "새 할 일", memo: "", status: "TODO", registerDatetime: "2026-09-03T10:00:00.000Z" },
    ],
    [
      "update",
      (client: ApiClient) => updateTask(client, "task-1", { memo: "수정" }),
      {
        title: "할 일",
        memo: "수정",
        status: "DONE",
        registerDatetime: "2026-09-03T10:00:00.000Z",
        id: "task-1",
      },
    ],
  ])("rejects an invalid %s response", async (_case, request, body) => {
    await expect(request(clientFor(body, {}))).rejects.toMatchObject({
      kind: "invalid-response",
    });
  });
});
