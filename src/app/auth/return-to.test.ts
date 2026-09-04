import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./return-to";

const origin = "https://assignment.test";

describe("safeReturnTo", () => {
  it.each([
    "/",
    "/task",
    "/task/",
    "/task/task-1",
    "/task/task-1/",
    "/task/task%2FA",
    "/user",
    "/%74ask",
    "/USER",
    "/task?page=2#next",
    "/task/task%2FA?tab=memo#content",
    "https://assignment.test/task/task-1?from=direct",
  ])("keeps an allowed same-origin route: %s", (path) => {
    const expected = path.startsWith(origin) ? path.slice(origin.length) : path;
    expect(safeReturnTo(path, origin)).toBe(expected);
  });

  it.each([
    "https://evil.test/task",
    "//evil.test/task",
    "/sign-in",
    "/sign-in/",
    "/%73ign-in",
    "/SIGN-UP",
    "/unknown",
    "/task/a/b",
    "/task/%",
    "not a URL%",
  ])("falls back to root: %s", (path) => expect(safeReturnTo(path, origin)).toBe("/"));
});
