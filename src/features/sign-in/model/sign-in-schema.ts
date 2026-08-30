import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().min(1, "이메일을 입력해주세요.").email("올바른 이메일을 입력해주세요."),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다.")
    .max(24, "비밀번호는 24자 이하여야 합니다.")
    .regex(/^[A-Za-z0-9]+$/, "비밀번호는 영문과 숫자로만 입력해주세요."),
});

export type SignInValues = z.infer<typeof signInSchema>;
