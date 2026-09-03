import { http, HttpResponse } from "msw";
import {
  bearerUserId,
  revokeAuthSession,
  rotateRefreshToken,
  startAuthSession,
} from "../fixtures/auth";
import { authenticateUser } from "../fixtures/users";

const refreshCookie = (token: string) =>
  `token=${token}; Path=/api/refresh; HttpOnly; SameSite=Strict`;
const expiredRefreshCookie = "token=; Path=/api/refresh; HttpOnly; Max-Age=0; SameSite=Strict";

export const authHandlers = [
  http.post("/api/sign-in", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const credentials =
      body === null ||
      Array.isArray(body) ||
      Object.keys(body).length !== 2 ||
      !Object.hasOwn(body, "email") ||
      !Object.hasOwn(body, "password") ||
      typeof body.email !== "string" ||
      typeof body.password !== "string"
        ? null
        : authenticateUser(body.email, body.password);
    if (!credentials) {
      return HttpResponse.json(
        { errorMessage: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 400 },
      );
    }
    const pair = startAuthSession(credentials.id);
    return HttpResponse.json(pair, {
      headers: { "Set-Cookie": refreshCookie(pair.refreshToken) },
    });
  }),
  http.post("/api/refresh", ({ cookies }) => {
    const pair = cookies.token ? rotateRefreshToken(cookies.token) : null;
    if (!pair) {
      return HttpResponse.json(
        { errorMessage: "인증 정보를 갱신할 수 없습니다." },
        { status: 401, headers: { "Set-Cookie": expiredRefreshCookie } },
      );
    }
    return HttpResponse.json(pair, {
      headers: { "Set-Cookie": refreshCookie(pair.refreshToken) },
    });
  }),
  http.post("/api/sign-out", ({ request }) => {
    const userId = bearerUserId(request.headers.get("Authorization"));
    if (!userId || !revokeAuthSession(userId)) {
      return HttpResponse.json({ errorMessage: "인증이 필요합니다." }, { status: 401 });
    }
    return HttpResponse.json(
      { success: true as const },
      { headers: { "Set-Cookie": expiredRefreshCookie } },
    );
  }),
];
