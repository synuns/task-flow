import { describe, expect, it } from "vitest";
import { isApiError } from "./api-error";

describe("isApiError", () => {
  it.each([
    { kind: "http", status: 404, message: "없음" },
    { kind: "invalid-response", status: 200, message: "잘못된 응답" },
    { kind: "network", message: "연결 실패" },
    { kind: "aborted", message: "취소" },
  ])("accepts $kind errors", (error) => {
    expect(isApiError(error)).toBe(true);
  });

  it.each([
    null,
    { kind: "other", message: "알 수 없음" },
    { kind: "http", message: "상태 없음" },
    { kind: "network", message: 1 },
  ])("rejects values outside the ApiError union", (value) => {
    expect(isApiError(value)).toBe(false);
  });
});
