import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { server } from "@/mocks/server";
import { requestJson } from "./request";

type DashboardResponse = {
  numOfTask: number;
  numOfRestTask: number;
  numOfDoneTask: number;
};

function isDashboardResponse(value: unknown): value is DashboardResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.numOfTask === "number" &&
    typeof data.numOfRestTask === "number" &&
    typeof data.numOfDoneTask === "number"
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("requestJson", () => {
  it("returns a valid success response", async () => {
    server.use(
      http.get("http://localhost/api/dashboard", () =>
        HttpResponse.json({ numOfTask: 3, numOfRestTask: 2, numOfDoneTask: 1 }),
      ),
    );

    await expect(
      requestJson("http://localhost/api/dashboard", { method: "GET" }, isDashboardResponse),
    ).resolves.toEqual({ numOfTask: 3, numOfRestTask: 2, numOfDoneTask: 1 });
  });

  it("preserves status and errorMessage for a valid non-2xx response", async () => {
    server.use(
      http.get("http://localhost/api/dashboard", () =>
        HttpResponse.json({ errorMessage: "인증이 필요합니다." }, { status: 401 }),
      ),
    );

    await expect(
      requestJson("http://localhost/api/dashboard", { method: "GET" }, isDashboardResponse),
    ).rejects.toEqual({ kind: "http", status: 401, message: "인증이 필요합니다." });
  });

  it("classifies non-JSON as an invalid response", async () => {
    server.use(
      http.get(
        "http://localhost/api/dashboard",
        () =>
          new HttpResponse("not-json", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          }),
      ),
    );

    await expect(
      requestJson("http://localhost/api/dashboard", { method: "GET" }, isDashboardResponse),
    ).rejects.toEqual({
      kind: "invalid-response",
      status: 200,
      message: "API 응답 형식이 올바르지 않습니다.",
    });
  });

  it("classifies a schema mismatch as an invalid response", async () => {
    server.use(
      http.get("http://localhost/api/dashboard", () => HttpResponse.json({ numOfTask: "3" })),
    );

    await expect(
      requestJson("http://localhost/api/dashboard", { method: "GET" }, isDashboardResponse),
    ).rejects.toEqual({
      kind: "invalid-response",
      status: 200,
      message: "API 응답 형식이 올바르지 않습니다.",
    });
  });

  it("classifies fetch failure as a network error", async () => {
    server.use(http.get("http://localhost/api/dashboard", () => HttpResponse.error()));

    await expect(
      requestJson("http://localhost/api/dashboard", { method: "GET" }, isDashboardResponse),
    ).rejects.toEqual({ kind: "network", message: "네트워크 요청에 실패했습니다." });
  });

  it("classifies AbortError without a user-facing error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));

    await expect(
      requestJson("http://localhost/api/dashboard", { method: "GET" }, isDashboardResponse),
    ).rejects.toEqual({ kind: "aborted", message: "요청이 취소되었습니다." });
  });
});
