import { describe, expect, it } from "vitest";
import { createAttemptGuard } from "./attempt-guard";

describe("createAttemptGuard", () => {
  it("admits one synchronous attempt until the matching attempt finishes", () => {
    const guard = createAttemptGuard();

    const first = guard.begin();
    expect(first).toBe(1);
    expect(guard.begin()).toBeNull();
    expect(guard.pending()).toBe(true);
    expect(guard.isCurrent(1)).toBe(true);

    guard.finish(2);
    expect(guard.pending()).toBe(true);
    guard.finish(1);
    expect(guard.pending()).toBe(false);
    expect(guard.begin()).toBe(2);
  });
});
