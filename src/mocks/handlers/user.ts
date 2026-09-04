import { http, HttpResponse } from "msw";
import { z } from "zod";
import { bearerUserId, revokeAuthSession } from "../fixtures/auth";
import { testAccountIds } from "../fixtures/test-accounts";
import {
  createStoredUser,
  findUser,
  removeAccount,
  type StoredUser,
  updateStoredUser,
} from "../fixtures/users";

const createUserSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z
    .string()
    .min(8)
    .max(24)
    .regex(/^[A-Za-z0-9]+$/),
  name: z.string().trim().min(1).max(50),
});
const updateUserSchema = z.union([
  z.strictObject({ name: z.string().trim().min(1).max(50) }),
  z.strictObject({ memo: z.string().max(500) }),
]);
const deleteUserSchema = z.strictObject({ password: z.string().min(1) });
const expiredRefreshCookie = "token=; Path=/api/refresh; HttpOnly; Max-Age=0; SameSite=Strict";

const unauthorized = () =>
  HttpResponse.json({ errorMessage: "인증이 필요합니다." }, { status: 401 });
const invalidCreate = () =>
  HttpResponse.json({ errorMessage: "가입 정보를 확인해주세요." }, { status: 400 });
const invalidUpdate = () =>
  HttpResponse.json({ errorMessage: "수정할 정보를 확인해주세요." }, { status: 400 });
const invalidPassword = () =>
  HttpResponse.json({ errorMessage: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 });
const responseUser = ({ email, name, memo }: StoredUser) => ({ email, name, memo });

async function json(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

export const userHandlers = [
  http.post("/api/user", async ({ request }) => {
    const input = createUserSchema.safeParse(await json(request));
    if (!input.success) return invalidCreate();
    const user = createStoredUser(input.data);
    return user
      ? HttpResponse.json(responseUser(user), { status: 201 })
      : HttpResponse.json({ errorMessage: "이미 사용 중인 이메일입니다." }, { status: 409 });
  }),
  http.get("/api/user", ({ request }) => {
    const userId = bearerUserId(request.headers.get("Authorization"));
    if (userId === testAccountIds.error) return HttpResponse.error();
    const user = userId ? findUser(userId) : null;
    return user ? HttpResponse.json(responseUser(user)) : unauthorized();
  }),
  http.patch("/api/user", async ({ request }) => {
    const userId = bearerUserId(request.headers.get("Authorization"));
    if (!userId) return unauthorized();
    const input = updateUserSchema.safeParse(await json(request));
    if (!input.success) return invalidUpdate();
    const user = updateStoredUser(userId, input.data);
    return user ? HttpResponse.json(responseUser(user)) : unauthorized();
  }),
  http.delete("/api/user", async ({ request }) => {
    const userId = bearerUserId(request.headers.get("Authorization"));
    if (!userId) return unauthorized();
    const input = deleteUserSchema.safeParse(await json(request));
    if (!input.success || !removeAccount(userId, input.data.password)) return invalidPassword();
    revokeAuthSession(userId);
    return HttpResponse.json(
      { success: true as const },
      { headers: { "Set-Cookie": expiredRefreshCookie } },
    );
  }),
];
