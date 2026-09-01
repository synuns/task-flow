import { http, HttpResponse } from "msw";
import { acceptsBearer } from "../fixtures/auth";
import { findTask, getDashboardMetrics, listTaskPage, removeTask } from "../fixtures/tasks";

const unauthorized = () =>
  HttpResponse.json({ errorMessage: "인증이 필요합니다." }, { status: 401 });
const missing = () =>
  HttpResponse.json({ errorMessage: "할 일을 찾을 수 없습니다." }, { status: 404 });
const invalidPage = () =>
  HttpResponse.json({ errorMessage: "page는 1 이상의 정수여야 합니다." }, { status: 400 });

export const taskHandlers = [
  http.get("/api/task", ({ request }) => {
    if (!acceptsBearer(request.headers.get("Authorization"))) return unauthorized();
    const pageValue = new URL(request.url).searchParams.get("page");
    const page = Number(pageValue);
    if (pageValue === null || !Number.isInteger(page) || page < 1) return invalidPage();
    return HttpResponse.json(listTaskPage(page));
  }),
  http.get("/api/task/:id", ({ params, request }) => {
    if (!acceptsBearer(request.headers.get("Authorization"))) return unauthorized();
    const task = findTask(String(params.id));
    return task
      ? HttpResponse.json({
          title: task.title,
          memo: task.memo,
          registerDatetime: task.registerDatetime,
        })
      : missing();
  }),
  http.delete("/api/task/:id", ({ params, request }) => {
    if (!acceptsBearer(request.headers.get("Authorization"))) return unauthorized();
    return removeTask(String(params.id))
      ? HttpResponse.json({ success: true as const })
      : missing();
  }),
  http.get("/api/dashboard", ({ request }) =>
    acceptsBearer(request.headers.get("Authorization"))
      ? HttpResponse.json(getDashboardMetrics())
      : unauthorized(),
  ),
];
