import { describe, expect, it } from "vitest";
import { createTaskSchema } from "./create-task-schema";

describe("createTaskSchema", () => {
  it("trims a valid title and defaults memo", () => {
    expect(createTaskSchema.parse({ title: "  새 할 일  " })).toEqual({
      title: "새 할 일",
      memo: "",
    });
  });

  it.each([
    { title: "   " },
    { title: "가".repeat(101) },
    { title: "할 일", memo: "가".repeat(501) },
    { title: "할 일", status: "TODO" },
  ])("rejects invalid or undocumented input %#", (input) => {
    expect(createTaskSchema.safeParse(input).success).toBe(false);
  });
});
