import { describe, expect, it } from "vitest";
import { signInSchema } from "./sign-in-schema";

describe("signInSchema", () => {
  it("accepts an email and an alphanumeric password from 8 to 24 characters", () => {
    expect(
      signInSchema.safeParse({ email: "user@example.com", password: "Password1" }).success,
    ).toBe(true);
  });

  it.each([
    [{ email: "", password: "Password1" }, "이메일을 입력해주세요."],
    [{ email: "not-an-email", password: "Password1" }, "올바른 이메일을 입력해주세요."],
    [{ email: "user@example.com", password: "Pass1" }, "비밀번호는 8자 이상이어야 합니다."],
    [
      { email: "user@example.com", password: "PasswordPasswordPassword1" },
      "비밀번호는 24자 이하여야 합니다.",
    ],
    [
      { email: "user@example.com", password: "Password!" },
      "비밀번호는 영문과 숫자로만 입력해주세요.",
    ],
  ])("rejects invalid credentials with a visible message", (input, message) => {
    const result = signInSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(message);
    }
  });
});
