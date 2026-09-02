import type { components } from "@/generated/openapi";
import type { ApiClient } from "./api-client-context";
import { hasExactKeys } from "./request";

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
  return (
    hasExactKeys(value, ["id", "title", "memo", "status"]) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.memo === "string" &&
    (value.status === "TODO" || value.status === "DONE")
  );
}

function isTaskPage(value: unknown): value is GeneratedTaskListResponse {
  return (
    hasExactKeys(value, ["data", "hasNext"]) &&
    Array.isArray(value.data) &&
    value.data.every(isTaskItem) &&
    typeof value.hasNext === "boolean"
  );
}

function isTaskDetail(value: unknown): value is TaskDetail {
  return (
    hasExactKeys(value, ["title", "memo", "registerDatetime"]) &&
    typeof value.title === "string" &&
    typeof value.memo === "string" &&
    typeof value.registerDatetime === "string"
  );
}

function isDeleteTaskResult(value: unknown): value is DeleteTaskResult {
  return hasExactKeys(value, ["success"]) && value.success === true;
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
