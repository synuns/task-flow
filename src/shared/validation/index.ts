import { z } from "zod";

export const loginEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "이메일을 입력해주세요.")
  .max(254, "이메일은 254자 이하여야 합니다.")
  .email("올바른 이메일을 입력해주세요.");

export const loginPasswordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .max(24, "비밀번호는 24자 이하여야 합니다.")
  .regex(/^[A-Za-z0-9]+$/, "비밀번호는 영문과 숫자로만 입력해주세요.");
