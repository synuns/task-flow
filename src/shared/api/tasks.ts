import type { components } from "@/generated/crud-openapi";
import { z } from "zod";
import type { ApiClient } from "./api-client-context";
import { hasExactKeys } from "./request";

type GeneratedTaskListResponse = components["schemas"]["TaskListResponse"];
export type TaskStatusData = components["schemas"]["TaskStatus"];
export type CreateTaskInput = components["schemas"]["CreateTaskRequest"];
export type UpdateTaskInput = components["schemas"]["UpdateTaskRequest"];
export type TaskListItem = components["schemas"]["TaskItem"];
export type TaskPage = GeneratedTaskListResponse;
export type TaskDetailData = components["schemas"]["TaskDetailResponse"];
export type CreatedTaskData = components["schemas"]["CreatedTaskResponse"];
export type DeleteTaskResult = components["schemas"]["DeleteTaskResponse"];

function isTaskStatus(value: unknown): value is TaskStatusData {
  return value === "TODO" || value === "IN_PROGRESS" || value === "DONE";
}

function isTaskItem(value: unknown): value is TaskListItem {
  return (
    hasExactKeys(value, ["id", "title", "memo", "status"]) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.memo === "string" &&
    isTaskStatus(value.status)
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

function isTaskDetail(value: unknown): value is TaskDetailData {
  return (
    hasExactKeys(value, ["title", "memo", "status", "registerDatetime"]) &&
    typeof value.title === "string" &&
    typeof value.memo === "string" &&
    isTaskStatus(value.status) &&
    z.iso.datetime({ offset: true }).safeParse(value.registerDatetime).success
  );
}

function isCreatedTask(value: unknown): value is CreatedTaskData {
  return (
    hasExactKeys(value, ["id", "title", "memo", "status", "registerDatetime"]) &&
    typeof value.id === "string" &&
    isTaskDetail({
      title: value.title,
      memo: value.memo,
      status: value.status,
      registerDatetime: value.registerDatetime,
    })
  );
}

function isDeleteTaskResult(value: unknown): value is DeleteTaskResult {
  return hasExactKeys(value, ["success"]) && value.success === true;
}

const taskUrl = () => new URL("/api/task", globalThis.location?.origin ?? "http://localhost");
const jsonHeaders = { "Content-Type": "application/json" };

export function createTask(client: ApiClient, input: CreateTaskInput): Promise<CreatedTaskData> {
  return client.request(
    taskUrl(),
    { method: "POST", headers: jsonHeaders, body: JSON.stringify(input) },
    isCreatedTask,
  );
}

export function getTasks(client: ApiClient, page: number, signal?: AbortSignal): Promise<TaskPage> {
  const url = taskUrl();
  url.searchParams.set("page", String(page));
  return client.request(url, { method: "GET", signal }, isTaskPage);
}

export function getTaskDetail(
  client: ApiClient,
  id: string,
  signal?: AbortSignal,
): Promise<TaskDetailData> {
  const url = new URL(
    `/api/task/${encodeURIComponent(id)}`,
    globalThis.location?.origin ?? "http://localhost",
  );
  return client.request(url, { method: "GET", signal }, isTaskDetail);
}

export function updateTask(
  client: ApiClient,
  id: string,
  input: UpdateTaskInput,
): Promise<TaskDetailData> {
  const url = new URL(
    `/api/task/${encodeURIComponent(id)}`,
    globalThis.location?.origin ?? "http://localhost",
  );
  return client.request(
    url,
    { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(input) },
    isTaskDetail,
  );
}

export function deleteTask(client: ApiClient, id: string): Promise<DeleteTaskResult> {
  const url = new URL(
    `/api/task/${encodeURIComponent(id)}`,
    globalThis.location?.origin ?? "http://localhost",
  );
  return client.request(url, { method: "DELETE" }, isDeleteTaskResult);
}
