import { z } from "zod";
import { loginEmailSchema, loginPasswordSchema } from "@/shared/validation";

export const signUpSchema = z
  .strictObject({
    email: loginEmailSchema,
    password: loginPasswordSchema,
    passwordConfirmation: z.string().min(1, "비밀번호를 한 번 더 입력해주세요."),
    name: z.string().trim().min(1, "이름을 입력해주세요.").max(50, "이름은 50자 이하여야 합니다."),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "비밀번호가 일치하지 않습니다.",
  });

export type SignUpValues = z.input<typeof signUpSchema>;
