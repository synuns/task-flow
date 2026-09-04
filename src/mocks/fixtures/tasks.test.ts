import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixtureStorageKey = "__taskflow_msw_task_fixture__";
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
    vi.useRealTimers();
  });

  it("keeps a delete transaction across a page module reload", async () => {
    const firstModule = await import("./tasks");
    firstModule.resetTaskStore();
    expect(firstModule.removeTask("user-1", "task-1")?.id).toBe("task-1");

    vi.resetModules();
    const reloadedModule = await import("./tasks");

    expect(reloadedModule.findTask("user-1", "task-1")).toBeNull();
    expect(reloadedModule.getDashboardMetrics("user-1")).toEqual({
      numOfTask: 29,
      numOfRestTask: 19,
      numOfDoneTask: 10,
    });
  });

  it.each([
    ["an additional property", { ...storedTask, unexpected: true }],
    ["an invalid date-time", { ...storedTask, registerDatetime: "not-a-date" }],
    ["an invalid status", { ...storedTask, status: "BLOCKED" }],
  ])("restores the seed instead of accepting %s", async (_label, invalidTask) => {
    sessionStorage.setItem(fixtureStorageKey, JSON.stringify([invalidTask]));

    const fixture = await import("./tasks");

    expect(fixture.findTask("user-1", "stored-task")).toBeNull();
    expect(fixture.listTaskPage("user-1", 1).data[0]?.id).toBe("task-1");
  });

  it("restores the seed instead of accepting duplicate task IDs", async () => {
    sessionStorage.setItem(
      fixtureStorageKey,
      JSON.stringify([storedTask, { ...storedTask, ownerId: "user-2" }]),
    );

    const fixture = await import("./tasks");

    expect(fixture.findTask("user-1", "stored-task")).toBeNull();
    expect(fixture.findTask("user-1", "task-1")?.id).toBe("task-1");
  });

  it("restores the seed when the next numeric task ID cannot be represented safely", async () => {
    const exhausted = { ...storedTask, id: `task-${Number.MAX_SAFE_INTEGER}` };
    sessionStorage.setItem(fixtureStorageKey, JSON.stringify([exhausted]));

    const fixture = await import("./tasks");

    expect(fixture.findTask("user-1", exhausted.id)).toBeNull();
    expect(fixture.findTask("user-1", "task-1")?.id).toBe("task-1");
  });

  it("loads a valid persisted task state", async () => {
    sessionStorage.setItem(fixtureStorageKey, JSON.stringify([storedTask]));

    const fixture = await import("./tasks");

    expect(fixture.findTask("user-1", "stored-task")).toEqual(storedTask);
  });

  it("restores the seed for malformed JSON", async () => {
    sessionStorage.setItem(fixtureStorageKey, "{");

    const fixture = await import("./tasks");

    expect(fixture.listTaskPage("user-1", 1).data[0]?.id).toBe("task-1");
  });

  it("seeds enough mixed-status tasks to exercise fifteen pages", async () => {
    const fixture = await import("./tasks");
    const pages = Array.from({ length: 15 }, (_, index) =>
      fixture.listTaskPage("user-1", index + 1),
    );
    const seededTasks = pages.flatMap((page) => page.data);

    expect(seededTasks).toHaveLength(30);
    expect(seededTasks[0]?.id).toBe("task-1");
    expect(seededTasks.at(-1)?.id).toBe("task-30");
    expect(pages.slice(0, -1).every((page) => page.hasNext)).toBe(true);
    expect(pages.at(-1)?.hasNext).toBe(false);
    expect(
      seededTasks.reduce<Record<string, number>>((counts, task) => {
        counts[task.status] = (counts[task.status] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({ TODO: 11, IN_PROGRESS: 9, DONE: 10 });
    expect(fixture.getDashboardMetrics("user-1")).toEqual({
      numOfTask: 30,
      numOfRestTask: 20,
      numOfDoneTask: 10,
    });
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

  it("creates a trimmed TODO task with server-owned fields and persists it", async () => {
    vi.setSystemTime(new Date("2026-09-03T10:00:00.000Z"));
    const firstModule = await import("./tasks");

    const created = firstModule.createStoredTask("user-1", { title: " 새 할 일 " });

    expect(created).toEqual({
      id: "task-31",
      ownerId: "user-1",
      title: "새 할 일",
      memo: "",
      status: "TODO",
      registerDatetime: "2026-09-03T10:00:00.000Z",
    });
    vi.resetModules();
    const reloadedModule = await import("./tasks");
    expect(reloadedModule.findTask("user-1", created.id)).toEqual(created);
  });

  it("updates one field while counting IN_PROGRESS as remaining work", async () => {
    const fixture = await import("./tasks");

    expect(fixture.updateStoredTask("user-1", "task-1", { status: "IN_PROGRESS" })).toMatchObject({
      id: "task-1",
      status: "IN_PROGRESS",
    });
    expect(fixture.updateStoredTask("user-1", "task-1", { title: " 수정된 제목 " })).toMatchObject({
      id: "task-1",
      title: "수정된 제목",
      status: "IN_PROGRESS",
    });
    expect(fixture.getDashboardMetrics("user-1")).toEqual({
      numOfTask: 30,
      numOfRestTask: 20,
      numOfDoneTask: 10,
    });
  });

  it("does not update a task owned by another user", async () => {
    const fixture = await import("./tasks");

    expect(fixture.updateStoredTask("user-2", "task-1", { memo: "침범" })).toBeNull();
    expect(fixture.findTask("user-1", "task-1")?.memo).toBe("삭제 검증 대상");
  });
});
