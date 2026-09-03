import { describe, expect, it } from "vitest";
import { signUpSchema } from "./sign-up-schema";

const valid = {
  email: " User@Example.com ",
  password: "Password1",
  passwordConfirmation: "Password1",
  name: " 새 사용자 ",
};

describe("signUpSchema", () => {
  it("canonicalizes email and trims name", () => {
    expect(signUpSchema.parse(valid)).toEqual({
      ...valid,
      email: "user@example.com",
      name: "새 사용자",
    });
  });

  it.each([
    ["invalid email", { ...valid, email: "invalid" }],
    ["email over 254", { ...valid, email: `${"a".repeat(243)}@example.com` }],
    ["short password", { ...valid, password: "Pass123", passwordConfirmation: "Pass123" }],
    ["long password", { ...valid, password: "A".repeat(25), passwordConfirmation: "A".repeat(25) }],
    [
      "non-ASCII password",
      { ...valid, password: "Password한", passwordConfirmation: "Password한" },
    ],
    ["different confirmation", { ...valid, passwordConfirmation: "Password2" }],
    ["empty trimmed name", { ...valid, name: " " }],
    ["name over 50", { ...valid, name: "이".repeat(51) }],
  ])("rejects %s", (_case, input) => {
    expect(signUpSchema.safeParse(input).success).toBe(false);
  });
});
