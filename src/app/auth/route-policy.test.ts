import { describe, expect, it } from "vitest";
import { isProtectedPath, isPublicAuthPath } from "./route-policy";

describe("auth route policy", () => {
  it.each(["/", "/task", "/task/", "/task/task-1/", "/user/", "/%74ask", "/USER"])(
    "matches a protected router pathname: %s",
    (pathname) => expect(isProtectedPath(pathname)).toBe(true),
  );

  it.each(["/sign-in", "/sign-in/", "/%73ign-in", "/SIGN-UP"])(
    "matches a public auth pathname: %s",
    (pathname) => expect(isPublicAuthPath(pathname)).toBe(true),
  );

  it.each(["/unknown", "/task/a/b", "/sign-in/task"])(
    "rejects an unregistered pathname: %s",
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(false);
      expect(isPublicAuthPath(pathname)).toBe(false);
    },
  );
});
