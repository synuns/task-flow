import { describe, expect, it } from "vitest";
import { createAppQueryClient } from "./query-client";

describe("app query client", () => {
  it("does not retry queries without accepted behavior", () => {
    const client = createAppQueryClient();

    expect(client.getDefaultOptions().queries?.retry).toBe(false);
  });
});
