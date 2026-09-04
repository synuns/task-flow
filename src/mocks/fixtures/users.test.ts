import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetTaskStore, findTask } from "./tasks";
import {
  authenticateUser,
  createStoredUser,
  findUser,
  removeAccount,
  resetUserStore,
  updateStoredUser,
} from "./users";

const userFixtureStorageKey = "__taskflow_msw_user_fixture__";
const storedUser = {
  id: "user-41",
  email: "stored@example.com",
  password: "Password1",
  name: "저장 사용자",
  memo: "저장 경계 검증",
} as const;

describe("user fixture persistence", () => {
  beforeEach(() => {
    sessionStorage.removeItem(userFixtureStorageKey);
    vi.resetModules();
  });

  afterEach(async () => {
    const fixture = await import("./users");
    fixture.resetUserStore();
  });

  it.each([
    [
      "duplicate IDs",
      { sequence: 41, users: [storedUser, { ...storedUser, email: "other@example.com" }] },
    ],
    [
      "a non-canonical email",
      { sequence: 41, users: [{ ...storedUser, email: "Stored@example.com" }] },
    ],
    [
      "duplicate canonical emails",
      { sequence: 41, users: [storedUser, { ...storedUser, id: "user-other" }] },
    ],
    ["a sequence behind user IDs", { sequence: 40, users: [storedUser] }],
    [
      "an exhausted numeric sequence",
      {
        sequence: Number.MAX_SAFE_INTEGER,
        users: [{ ...storedUser, id: `user-${Number.MAX_SAFE_INTEGER}` }],
      },
    ],
  ])("restores the seed instead of accepting %s", async (_label, state) => {
    sessionStorage.setItem(userFixtureStorageKey, JSON.stringify(state));

    const fixture = await import("./users");

    expect(fixture.findUser("user-41")).toBeNull();
    expect(fixture.findUser("user-1")?.email).toBe("user@example.com");
  });

  it("loads valid persisted users and advances from the stored sequence", async () => {
    sessionStorage.setItem(
      userFixtureStorageKey,
      JSON.stringify({ sequence: 41, users: [storedUser] }),
    );

    const fixture = await import("./users");

    expect(fixture.findUser("user-41")).toEqual(storedUser);
    expect(
      fixture.createStoredUser({
        email: "next@example.com",
        password: "Password1",
        name: "다음 사용자",
      })?.id,
    ).toBe("user-42");
  });
});

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

  it("authenticates the fixed empty and error test accounts", () => {
    expect(authenticateUser("empty@example.com", "Password1")?.id).toBe("user-empty");
    expect(authenticateUser("error@example.com", "Password1")?.id).toBe("user-error");
  });

  it("removes every task owned by the deleted seed user", () => {
    expect(removeAccount("user-1", "Password1")).toEqual({ removedTaskCount: 30 });
    expect(findUser("user-1")).toBeNull();
    expect(findTask("user-1", "task-1")).toBeNull();
    expect(findTask("user-1", "task-2")).toBeNull();
    expect(findTask("user-1", "task-3")).toBeNull();
  });
});
