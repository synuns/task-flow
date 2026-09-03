import { describe, expect, expectTypeOf, it } from "vitest";
import type { components as crudComponents, paths as crudPaths } from "@/generated/crud-openapi";
import type { components, paths } from "@/generated/openapi";

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

  it("exposes the approved User CRUD extension separately", () => {
    type CreateUser201 =
      crudPaths["/api/user"]["post"]["responses"][201]["content"]["application/json"];
    type UserResponse = crudComponents["schemas"]["UserResponse"];
    type UpdateUserRequest = crudComponents["schemas"]["UpdateUserRequest"];

    const path: keyof crudPaths = "/api/user";
    const response: CreateUser201 = {
      email: "user@example.com",
      name: "김담당",
      memo: "",
    };

    expectTypeOf<CreateUser201>().toEqualTypeOf<UserResponse>();
    expectTypeOf<UserResponse>().toEqualTypeOf<{
      email: string;
      name: string;
      memo: string;
    }>();
    expectTypeOf<UpdateUserRequest>().toEqualTypeOf<{ name: string } | { memo: string }>();
    expect(path).toBe("/api/user");
    expect(response.email).toBe("user@example.com");
  });
});
