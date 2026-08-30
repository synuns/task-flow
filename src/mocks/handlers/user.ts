import { http, HttpResponse } from "msw";
import { acceptsBearer } from "../fixtures/auth";

export const userHandlers = [
  http.get("/api/user", ({ request }) =>
    acceptsBearer(request.headers.get("Authorization"))
      ? HttpResponse.json({ name: "김담당", memo: "오늘도 차근차근" })
      : HttpResponse.json({ errorMessage: "인증이 필요합니다." }, { status: 401 }),
  ),
];
