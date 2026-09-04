import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetTaskStore, findTask } from "./tasks";
import {
  authenticateUser,
  createStoredUser,
  findUser,
  removeAccount,
  resetUserStore,
  updateStoredUser,
} from "./users";

describe("user fixture store", () => {
  beforeEach(() => {
    resetUserStore();
    resetTaskStore();
  });

  afterEach(() => {
    resetUserStore();
    resetTaskStore();
  });

  it("owns canonical signup, authentication, one-field update, and deletion", () => {
    const created = createStoredUser({
      email: " New@Example.com ",
      password: "Password1",
      name: " 새 사용자 ",
    });

    expect(created).toMatchObject({ email: "new@example.com", name: "새 사용자", memo: "" });
    expect(
      createStoredUser({ email: "NEW@example.com", password: "Password1", name: "중복" }),
    ).toBeNull();
    expect(authenticateUser(" new@example.com ", "Password1")?.id).toBe(created?.id);
    expect(updateStoredUser(created?.id ?? "", { memo: "첫 메모" })?.memo).toBe("첫 메모");

    expect(removeAccount(created?.id ?? "", "Wrong123")).toBeNull();
    expect(findUser(created?.id ?? "")).not.toBeNull();
    expect(removeAccount(created?.id ?? "", "Password1")).toEqual({ removedTaskCount: 0 });
    expect(findUser(created?.id ?? "")).toBeNull();
  });

  it("removes every task owned by the deleted seed user", () => {
    expect(removeAccount("user-1", "Password1")).toEqual({ removedTaskCount: 30 });
    expect(findUser("user-1")).toBeNull();
    expect(findTask("user-1", "task-1")).toBeNull();
    expect(findTask("user-1", "task-2")).toBeNull();
    expect(findTask("user-1", "task-3")).toBeNull();
  });
});
