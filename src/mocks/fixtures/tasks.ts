type TaskItem = {
  id: string;
  title: string;
  memo: string;
  status: "TODO" | "DONE";
};
type TaskListResponse = { data: TaskItem[]; hasNext: boolean };
type DashboardResponse = {
  numOfTask: number;
  numOfRestTask: number;
  numOfDoneTask: number;
};

export type StoredTask = TaskItem & { registerDatetime: string };

const fixtureStorageKey = "__kbhc_msw_task_fixture__";

const seed: StoredTask[] = [
  {
    id: "task-1",
    title: "첫 번째 할 일",
    memo: "삭제 검증 대상",
    status: "TODO",
    registerDatetime: "2026-08-30T09:00:00.000Z",
  },
  {
    id: "task-2",
    title: "두 번째 할 일",
    memo: "남아 있는 TODO",
    status: "TODO",
    registerDatetime: "2026-08-30T10:00:00.000Z",
  },
  {
    id: "task-3",
    title: "완료한 일",
    memo: "남아 있는 DONE",
    status: "DONE",
    registerDatetime: "2026-08-30T11:00:00.000Z",
  },
];

function isStoredTask(value: unknown): value is StoredTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.memo === "string" &&
    (task.status === "TODO" || task.status === "DONE") &&
    typeof task.registerDatetime === "string"
  );
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
  persistTasks();
}

export function listTaskPage(page: number): TaskListResponse {
  const start = (page - 1) * taskPageSize;
  return {
    data: tasks.slice(start, start + taskPageSize).map(({ registerDatetime: _, ...task }) => task),
    hasNext: start + taskPageSize < tasks.length,
  };
}

export function findTask(id: string): StoredTask | null {
  return tasks.find((task) => task.id === id) ?? null;
}

export function removeTask(id: string): StoredTask | null {
  const index = tasks.findIndex((task) => task.id === id);
  if (index < 0) return null;
  const removed = tasks.splice(index, 1)[0] ?? null;
  persistTasks();
  return removed;
}

export function getDashboardMetrics(): DashboardResponse {
  return {
    numOfTask: tasks.length,
    numOfRestTask: tasks.filter((task) => task.status === "TODO").length,
    numOfDoneTask: tasks.filter((task) => task.status === "DONE").length,
  };
}
