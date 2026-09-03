import { z } from "zod";
import { loginEmailSchema, loginPasswordSchema } from "@/shared/validation";

export { loginEmailSchema, loginPasswordSchema };

export const signInSchema = z.strictObject({
  email: loginEmailSchema,
  password: loginPasswordSchema,
});

export type SignInValues = z.infer<typeof signInSchema>;
