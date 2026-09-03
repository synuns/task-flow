import { z } from "zod";

export const createTaskSchema = z.strictObject({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(100, "제목은 100자 이하여야 합니다."),
  memo: z.string().max(500, "메모는 500자 이하여야 합니다.").default(""),
});

export type CreateTaskValues = z.input<typeof createTaskSchema>;
