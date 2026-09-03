import { http, HttpResponse } from "msw";
import { bearerUserId } from "../fixtures/auth";
import { findTask, getDashboardMetrics, listTaskPage, removeTask } from "../fixtures/tasks";

const unauthorized = () =>
  HttpResponse.json({ errorMessage: "인증이 필요합니다." }, { status: 401 });
const missing = () =>
  HttpResponse.json({ errorMessage: "할 일을 찾을 수 없습니다." }, { status: 404 });

export const taskHandlers = [
  http.get("/api/task", ({ request }) => {
    const userId = bearerUserId(request.headers.get("Authorization"));
    if (!userId) return unauthorized();
    const pageValue = new URL(request.url).searchParams.get("page");
    const page = Number(pageValue);
    if (pageValue === null || !Number.isInteger(page) || page < 1) return HttpResponse.error();
    return HttpResponse.json(listTaskPage(userId, page));
  }),
  http.get("/api/task/:id", ({ params, request }) => {
    const userId = bearerUserId(request.headers.get("Authorization"));
    if (!userId) return unauthorized();
    const task = findTask(userId, String(params.id));
    return task
      ? HttpResponse.json({
          title: task.title,
          memo: task.memo,
          registerDatetime: task.registerDatetime,
        })
      : missing();
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
    return userId ? HttpResponse.json(getDashboardMetrics(userId)) : unauthorized();
  }),
];
