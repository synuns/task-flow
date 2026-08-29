import type { components, paths } from "@/generated/openapi";
import { describe, expect, it } from "vitest";

describe("generated OpenAPI contract", () => {
  it("exposes authoritative paths and schema shapes", () => {
    const signInPath: keyof paths = "/api/sign-in";
    const dashboard: components["schemas"]["DashboardResponse"] = {
      numOfTask: 3,
      numOfRestTask: 2,
      numOfDoneTask: 1,
    };
    const deleted: components["schemas"]["DeleteTaskResponse"] = { success: true };

    expect(signInPath).toBe("/api/sign-in");
    expect(dashboard).toEqual({ numOfTask: 3, numOfRestTask: 2, numOfDoneTask: 1 });
    expect(deleted.success).toBe(true);
  });
});
