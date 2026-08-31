import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./return-to";

const origin = "https://assignment.test";

describe("safeReturnTo", () => {
  it.each([
    "/",
    "/task",
    "/task/task-1",
    "/user",
    "/task?page=2#next",
    "https://assignment.test/task/task-1?from=direct",
  ])("keeps an allowed same-origin route: %s", (path) => {
    const expected = path.startsWith(origin) ? path.slice(origin.length) : path;
    expect(safeReturnTo(path, origin)).toBe(expected);
  });

  it.each([
    "https://evil.test/task",
    "//evil.test/task",
    "/sign-in",
    "/unknown",
    "/task/a%2Fb",
    "not a URL%",
  ])("falls back to root: %s", (path) => expect(safeReturnTo(path, origin)).toBe("/"));
});
