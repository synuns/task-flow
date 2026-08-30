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

let tasks = structuredClone(seed);

export function resetTaskStore(): void {
  tasks = structuredClone(seed);
}

export function listTaskPage(page: number): TaskListResponse {
  const start = (page - 1) * 20;
  return {
    data: tasks.slice(start, start + 20).map(({ registerDatetime: _, ...task }) => task),
    hasNext: start + 20 < tasks.length,
  };
}

export function findTask(id: string): StoredTask | null {
  return tasks.find((task) => task.id === id) ?? null;
}

export function removeTask(id: string): StoredTask | null {
  const index = tasks.findIndex((task) => task.id === id);
  if (index < 0) return null;
  return tasks.splice(index, 1)[0] ?? null;
}

export function getDashboardMetrics(): DashboardResponse {
  return {
    numOfTask: tasks.length,
    numOfRestTask: tasks.filter((task) => task.status === "TODO").length,
    numOfDoneTask: tasks.filter((task) => task.status === "DONE").length,
  };
}
