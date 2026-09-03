import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixtureStorageKey = "__kbhc_msw_task_fixture__";
const storedTask = {
  id: "stored-task",
  ownerId: "user-1",
  title: "저장된 할 일",
  memo: "저장 경계 검증",
  status: "TODO",
  registerDatetime: "2026-08-30T09:00:00.000Z",
} as const;

describe("task fixture persistence", () => {
  beforeEach(() => {
    sessionStorage.removeItem(fixtureStorageKey);
    vi.resetModules();
  });

  afterEach(async () => {
    const fixture = await import("./tasks");
    fixture.resetTaskStore();
  });

  it("keeps a delete transaction across a page module reload", async () => {
    const firstModule = await import("./tasks");
    firstModule.resetTaskStore();
    expect(firstModule.removeTask("user-1", "task-1")?.id).toBe("task-1");

    vi.resetModules();
    const reloadedModule = await import("./tasks");

    expect(reloadedModule.findTask("user-1", "task-1")).toBeNull();
    expect(reloadedModule.getDashboardMetrics("user-1")).toEqual({
      numOfTask: 2,
      numOfRestTask: 1,
      numOfDoneTask: 1,
    });
  });

  it.each([
    ["an additional property", { ...storedTask, unexpected: true }],
    ["an invalid date-time", { ...storedTask, registerDatetime: "not-a-date" }],
    ["an invalid status", { ...storedTask, status: "IN_PROGRESS" }],
  ])("restores the seed instead of accepting %s", async (_label, invalidTask) => {
    sessionStorage.setItem(fixtureStorageKey, JSON.stringify([invalidTask]));

    const fixture = await import("./tasks");

    expect(fixture.findTask("user-1", "stored-task")).toBeNull();
    expect(fixture.listTaskPage("user-1", 1).data[0]?.id).toBe("task-1");
  });

  it("restores the seed for malformed JSON", async () => {
    sessionStorage.setItem(fixtureStorageKey, "{");

    const fixture = await import("./tasks");

    expect(fixture.listTaskPage("user-1", 1).data[0]?.id).toBe("task-1");
  });

  it("never exposes tasks owned by another user", async () => {
    const fixture = await import("./tasks");

    expect(fixture.listTaskPage("user-2", 1)).toEqual({ data: [], hasNext: false });
    expect(fixture.findTask("user-2", "task-1")).toBeNull();
    expect(fixture.removeTask("user-2", "task-1")).toBeNull();
    expect(fixture.getDashboardMetrics("user-2")).toEqual({
      numOfTask: 0,
      numOfRestTask: 0,
      numOfDoneTask: 0,
    });
  });
});
