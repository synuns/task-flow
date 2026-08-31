import { describe, expect, it } from "vitest";
import type { ApiClient } from "./api-client-context";
import { getUser } from "./user";

function clientFor(body: unknown, capture: { url?: string; method?: string }): ApiClient {
  return {
    request: async <T>(
      input: RequestInfo | URL,
      init: RequestInit,
      isSuccess: (value: unknown) => value is T,
    ) => {
      capture.url = String(input);
      capture.method = init.method;
      if (!isSuccess(body)) {
        throw { kind: "invalid-response", status: 200, message: "invalid" };
      }
      return body;
    },
  };
}

describe("user API", () => {
  it("requests the current user with GET and accepts the OpenAPI profile shape", async () => {
    const capture: { url?: string; method?: string } = {};
    const body = { name: "김담당", memo: "오늘도 차근차근" };

    await expect(getUser(clientFor(body, capture))).resolves.toEqual(body);
    expect(capture).toEqual({ url: `${globalThis.location.origin}/api/user`, method: "GET" });
  });

  it("rejects a response with a missing profile field", async () => {
    const capture: { url?: string; method?: string } = {};

    await expect(getUser(clientFor({ name: "김담당" }, capture))).rejects.toMatchObject({
      kind: "invalid-response",
    });
  });
});
