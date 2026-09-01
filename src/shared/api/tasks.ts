import type { components } from "@/generated/openapi";
import type { ApiClient } from "./api-client-context";

type GeneratedTaskListResponse = components["schemas"]["TaskListResponse"];
export type TaskListItem = {
  id: string;
  title: string;
  memo: string;
  status: "TODO" | "DONE";
};
export type TaskPage = { data: TaskListItem[]; hasNext: boolean };
export type TaskDetail = { title: string; memo: string; registerDatetime: string };
export type DeleteTaskResult = { success: true };

function isTaskItem(value: unknown): value is TaskListItem {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.id === "string" &&
    typeof data.title === "string" &&
    typeof data.memo === "string" &&
    (data.status === "TODO" || data.status === "DONE")
  );
}

function isTaskPage(value: unknown): value is GeneratedTaskListResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    Array.isArray(data.data) && data.data.every(isTaskItem) && typeof data.hasNext === "boolean"
  );
}

function isTaskDetail(value: unknown): value is TaskDetail {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.title === "string" &&
    typeof data.memo === "string" &&
    typeof data.registerDatetime === "string"
  );
}

function isDeleteTaskResult(value: unknown): value is DeleteTaskResult {
  return (
    !!value && typeof value === "object" && (value as Record<string, unknown>).success === true
  );
}

export function getTasks(client: ApiClient, page: number, signal?: AbortSignal): Promise<TaskPage> {
  const url = new URL("/api/task", globalThis.location?.origin ?? "http://localhost");
  url.searchParams.set("page", String(page));
  return client.request(url, { method: "GET", signal }, isTaskPage);
}

export function getTaskDetail(
  client: ApiClient,
  id: string,
  signal?: AbortSignal,
): Promise<TaskDetail> {
  const url = new URL(
    `/api/task/${encodeURIComponent(id)}`,
    globalThis.location?.origin ?? "http://localhost",
  );
  return client.request(url, { method: "GET", signal }, isTaskDetail);
}

export function deleteTask(client: ApiClient, id: string): Promise<DeleteTaskResult> {
  const url = new URL(
    `/api/task/${encodeURIComponent(id)}`,
    globalThis.location?.origin ?? "http://localhost",
  );
  return client.request(url, { method: "DELETE" }, isDeleteTaskResult);
}
