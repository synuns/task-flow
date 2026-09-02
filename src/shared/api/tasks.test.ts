import { describe, expect, it } from "vitest";
import type { ApiClient } from "./api-client-context";
import { deleteTask, getTaskDetail, getTasks } from "./tasks";

function clientFor(body: unknown, capture: { url?: string; method?: string }): ApiClient {
  return {
    request: async <T>(
      input: RequestInfo | URL,
      init: RequestInit,
      isSuccess: (value: unknown) => value is T,
    ) => {
      capture.url = String(input);
      capture.method = init.method;
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
      registerDatetime: "2026-08-30T09:00:00.000Z",
    };

    await expect(getTaskDetail(clientFor(body, capture), "task/A")).resolves.toEqual(body);
    expect(capture).toEqual({
      url: `${globalThis.location.origin}/api/task/task%2FA`,
      method: "GET",
    });
  });

  it("rejects an otherwise valid task detail with an invalid date-time", async () => {
    const capture: { url?: string; method?: string } = {};

    await expect(
      getTaskDetail(
        clientFor({ title: "할 일", memo: "메모", registerDatetime: "not-a-date" }, capture),
        "task-1",
      ),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("requests the exact page and accepts the OpenAPI task-list shape", async () => {
    const capture: { url?: string; method?: string } = {};
    const body = {
      data: [{ id: "task-1", title: "첫 번째 할 일", memo: "삭제 검증 대상", status: "TODO" }],
      hasNext: true,
    };

    await expect(getTasks(clientFor(body, capture), 1)).resolves.toEqual(body);
    expect(capture).toEqual({
      url: `${globalThis.location.origin}/api/task?page=1`,
      method: "GET",
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
            registerDatetime: "2026-08-30T09:00:00.000Z",
            id: "task-1",
          },
          capture,
        ),
        "task-1",
      ),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("rejects a delete response with an undocumented property", async () => {
    const capture: { url?: string; method?: string } = {};

    await expect(
      deleteTask(clientFor({ success: true, deletedId: "task-1" }, capture), "task-1"),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });
});
