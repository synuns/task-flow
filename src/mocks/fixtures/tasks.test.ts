import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixtureStorageKey = "__kbhc_msw_task_fixture__";

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
    expect(firstModule.removeTask("task-1")?.id).toBe("task-1");

    vi.resetModules();
    const reloadedModule = await import("./tasks");

    expect(reloadedModule.findTask("task-1")).toBeNull();
    expect(reloadedModule.getDashboardMetrics()).toEqual({
      numOfTask: 2,
      numOfRestTask: 1,
      numOfDoneTask: 1,
    });
  });
});
