import { z } from "zod";

type TaskItem = {
  id: string;
  title: string;
  memo: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
};
type TaskListResponse = { data: TaskItem[]; hasNext: boolean };
type DashboardResponse = {
  numOfTask: number;
  numOfRestTask: number;
  numOfDoneTask: number;
};

const storedTaskSchema = z.strictObject({
  id: z.string(),
  ownerId: z.string(),
  title: z.string(),
  memo: z.string(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  registerDatetime: z.iso.datetime({ offset: true }),
});

export type StoredTask = z.infer<typeof storedTaskSchema>;

const fixtureStorageKey = "__kbhc_msw_task_fixture__";

const seed: StoredTask[] = [
  {
    id: "task-1",
    ownerId: "user-1",
    title: "첫 번째 할 일",
    memo: "삭제 검증 대상",
    status: "TODO",
    registerDatetime: "2026-08-30T09:00:00.000Z",
  },
  {
    id: "task-2",
    ownerId: "user-1",
    title: "두 번째 할 일",
    memo: "남아 있는 TODO",
    status: "TODO",
    registerDatetime: "2026-08-30T10:00:00.000Z",
  },
  {
    id: "task-3",
    ownerId: "user-1",
    title: "완료한 일",
    memo: "남아 있는 DONE",
    status: "DONE",
    registerDatetime: "2026-08-30T11:00:00.000Z",
  },
];

function isStoredTask(value: unknown): value is StoredTask {
  return storedTaskSchema.safeParse(value).success;
}

function loadTasks(): StoredTask[] {
  try {
    const raw = globalThis.sessionStorage?.getItem(fixtureStorageKey);
    if (!raw) return structuredClone(seed);
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every(isStoredTask)
      ? structuredClone(parsed)
      : structuredClone(seed);
  } catch {
    return structuredClone(seed);
  }
}

let tasks = loadTasks();
let nextTaskSequence =
  Math.max(0, ...tasks.map(({ id }) => Number(/^task-(\d+)$/.exec(id)?.[1] ?? 0))) + 1;
const taskPageSize = 2;

function persistTasks(): void {
  try {
    globalThis.sessionStorage?.setItem(fixtureStorageKey, JSON.stringify(tasks));
  } catch {
    // A storage-disabled browser can still exercise the fixture until the next reload.
  }
}

export function resetTaskStore(): void {
  tasks = structuredClone(seed);
  nextTaskSequence = seed.length + 1;
  persistTasks();
}

export function createStoredTask(
  ownerId: string,
  input: { title: string; memo?: string },
): StoredTask {
  const task: StoredTask = {
    id: `task-${nextTaskSequence++}`,
    ownerId,
    title: input.title.trim(),
    memo: input.memo ?? "",
    status: "TODO",
    registerDatetime: new Date().toISOString(),
  };
  tasks.push(task);
  persistTasks();
  return structuredClone(task);
}

export function updateStoredTask(
  ownerId: string,
  id: string,
  patch: { title: string } | { memo: string } | { status: StoredTask["status"] },
): StoredTask | null {
  const task = findTask(ownerId, id);
  if (!task) return null;
  if ("title" in patch) task.title = patch.title.trim();
  else if ("memo" in patch) task.memo = patch.memo;
  else task.status = patch.status;
  persistTasks();
  return structuredClone(task);
}

export function listTaskPage(ownerId: string, page: number): TaskListResponse {
  const ownedTasks = tasks.filter((task) => task.ownerId === ownerId);
  const start = (page - 1) * taskPageSize;
  return {
    data: ownedTasks
      .slice(start, start + taskPageSize)
      .map(({ ownerId: _, registerDatetime: __, ...task }) => task),
    hasNext: start + taskPageSize < ownedTasks.length,
  };
}

export function findTask(ownerId: string, id: string): StoredTask | null {
  return tasks.find((task) => task.ownerId === ownerId && task.id === id) ?? null;
}

export function removeTask(ownerId: string, id: string): StoredTask | null {
  const index = tasks.findIndex((task) => task.ownerId === ownerId && task.id === id);
  if (index < 0) return null;
  const removed = tasks.splice(index, 1)[0] ?? null;
  persistTasks();
  return removed;
}

export function removeTasksByOwner(ownerId: string): number {
  const previousCount = tasks.length;
  tasks = tasks.filter((task) => task.ownerId !== ownerId);
  const removedCount = previousCount - tasks.length;
  if (removedCount > 0) persistTasks();
  return removedCount;
}

export function getDashboardMetrics(ownerId: string): DashboardResponse {
  const ownedTasks = tasks.filter((task) => task.ownerId === ownerId);
  return {
    numOfTask: ownedTasks.length,
    numOfRestTask: ownedTasks.filter((task) => task.status !== "DONE").length,
    numOfDoneTask: ownedTasks.filter((task) => task.status === "DONE").length,
  };
}
