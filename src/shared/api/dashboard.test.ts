import { describe, expect, it } from "vitest";
import type { ApiClient } from "./api-client-context";
import { getDashboard } from "./dashboard";

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

describe("dashboard API", () => {
  it("requests the dashboard with GET and accepts the OpenAPI metric shape", async () => {
    const capture: { url?: string; method?: string } = {};
    const body = { numOfTask: 3, numOfRestTask: 2, numOfDoneTask: 1 };

    await expect(getDashboard(clientFor(body, capture))).resolves.toEqual(body);
    expect(capture).toEqual({
      url: `${globalThis.location.origin}/api/dashboard`,
      method: "GET",
    });
  });

  it("rejects a response with a missing dashboard metric", async () => {
    const capture: { url?: string; method?: string } = {};

    await expect(
      getDashboard(clientFor({ numOfTask: 3, numOfRestTask: 2 }, capture)),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("rejects a dashboard response with an undocumented property", async () => {
    const capture: { url?: string; method?: string } = {};

    await expect(
      getDashboard(
        clientFor({ numOfTask: 3, numOfRestTask: 2, numOfDoneTask: 1, owner: "user-1" }, capture),
      ),
    ).rejects.toMatchObject({ kind: "invalid-response" });
  });
});
