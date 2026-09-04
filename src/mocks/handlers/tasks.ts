import { http, HttpResponse } from "msw";
import { z } from "zod";
import { bearerUserId } from "../fixtures/auth";
import { testAccountIds } from "../fixtures/test-accounts";
import {
  createStoredTask,
  findTask,
  getDashboardMetrics,
  listTaskPage,
  removeTask,
  type StoredTask,
  updateStoredTask,
} from "../fixtures/tasks";

const unauthorized = () =>
  HttpResponse.json({ errorMessage: "인증이 필요합니다." }, { status: 401 });
const missing = () =>
  HttpResponse.json({ errorMessage: "할 일을 찾을 수 없습니다." }, { status: 404 });
const invalidCreate = () =>
  HttpResponse.json({ errorMessage: "할 일 입력 값이 올바르지 않습니다." }, { status: 400 });
const invalidUpdate = () =>
  HttpResponse.json({ errorMessage: "할 일 수정 값이 올바르지 않습니다." }, { status: 400 });

const createTaskSchema = z.strictObject({
  title: z.string().trim().min(1).max(100),
  memo: z.string().max(500).optional(),
});
const updateTaskSchema = z.union([
  z.strictObject({ title: z.string().trim().min(1).max(100) }),
  z.strictObject({ memo: z.string().max(500) }),
  z.strictObject({ status: z.enum(["TODO", "IN_PROGRESS", "DONE"]) }),
]);

function taskDetail(task: StoredTask) {
  return {
    title: task.title,
    memo: task.memo,
    status: task.status,
    registerDatetime: task.registerDatetime,
  };
}

export const taskHandlers = [
  http.get("/api/task", ({ request }) => {
    const userId = bearerUserId(request.headers.get("Authorization"));
    if (!userId) return unauthorized();
    if (userId === testAccountIds.error) return HttpResponse.error();
    const pageValue = new URL(request.url).searchParams.get("page");
    const page = Number(pageValue);
    if (pageValue === null || !Number.isInteger(page) || page < 1) return HttpResponse.error();
    return HttpResponse.json(listTaskPage(userId, page));
  }),
  http.post("/api/task", async ({ request }) => {
    const userId = bearerUserId(request.headers.get("Authorization"));
    if (!userId) return unauthorized();
    const input = createTaskSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return invalidCreate();
    const task = createStoredTask(userId, input.data);
    return HttpResponse.json({ id: task.id, ...taskDetail(task) }, { status: 201 });
  }),
  http.get("/api/task/:id", ({ params, request }) => {
    const userId = bearerUserId(request.headers.get("Authorization"));
    if (!userId) return unauthorized();
    if (userId === testAccountIds.error) return HttpResponse.error();
    const task = findTask(userId, String(params.id));
    return task ? HttpResponse.json(taskDetail(task)) : missing();
  }),
  http.patch("/api/task/:id", async ({ params, request }) => {
    const userId = bearerUserId(request.headers.get("Authorization"));
    if (!userId) return unauthorized();
    const id = String(params.id);
    if (!findTask(userId, id)) return missing();
    const patch = updateTaskSchema.safeParse(await request.json().catch(() => null));
    if (!patch.success) return invalidUpdate();
    const task = updateStoredTask(userId, id, patch.data);
    return task ? HttpResponse.json(taskDetail(task)) : missing();
  }),
  http.delete("/api/task/:id", ({ params, request }) => {
    const userId = bearerUserId(request.headers.get("Authorization"));
    if (!userId) return unauthorized();
    return removeTask(userId, String(params.id))
      ? HttpResponse.json({ success: true as const })
      : missing();
  }),
  http.get("/api/dashboard", ({ request }) => {
    const userId = bearerUserId(request.headers.get("Authorization"));
    if (!userId) return unauthorized();
    return userId === testAccountIds.error
      ? HttpResponse.error()
      : HttpResponse.json(getDashboardMetrics(userId));
  }),
];
