import type { ApiClient, ApiError } from "@/shared/api";
import { describe, expect, it } from "vitest";
import { recheckTaskPresence, resolveDeleteAttempt } from "./delete-task";

type Outcome = { body: unknown } | { error: ApiError };

const detail = {
  title: "첫 번째 할 일",
  memo: "삭제 검증 대상",
  registerDatetime: "2026-08-30T09:00:00.000Z",
};

function clientFor(outcomes: Outcome[], methods: string[]): ApiClient {
  return {
    request: async <T>(
      _input: RequestInfo | URL,
      init: RequestInit,
      isSuccess: (value: unknown) => value is T,
    ): Promise<T> => {
      methods.push(init.method ?? "GET");
      const outcome = outcomes.shift();
      if (!outcome) throw new Error("missing outcome");
      if ("error" in outcome) throw outcome.error;
      if (!isSuccess(outcome.body)) throw new Error("invalid fixture");
      return outcome.body;
    },
  };
}

const http404 = (message = "할 일을 찾을 수 없습니다."): ApiError => ({
  kind: "http",
  status: 404,
  message,
});
const network: ApiError = { kind: "network", message: "네트워크 요청에 실패했습니다." };
const invalid: ApiError = {
  kind: "invalid-response",
  status: 200,
  message: "API 응답 형식이 올바르지 않습니다.",
};
const aborted: ApiError = { kind: "aborted", message: "요청이 취소되었습니다." };

describe("resolveDeleteAttempt", () => {
  it.each([
    {
      name: "200 success",
      outcomes: [{ body: { success: true } }],
      expected: { kind: "success" },
      methods: ["DELETE"],
    },
    {
      name: "404",
      outcomes: [{ error: http404("이미 존재하지 않는 할 일입니다.") }],
      expected: { kind: "absent", message: "이미 존재하지 않는 할 일입니다." },
      methods: ["DELETE"],
    },
    {
      name: "network then GET 200",
      outcomes: [{ error: network }, { body: detail }],
      expected: {
        kind: "exists",
        message: "할 일이 존재합니다. 삭제를 다시 시도할 수 있습니다.",
      },
      methods: ["DELETE", "GET"],
    },
    {
      name: "invalid response then GET 404",
      outcomes: [{ error: invalid }, { error: http404() }],
      expected: {
        kind: "absent",
        message: "할 일이 현재 존재하지 않습니다. 삭제 성공으로 판정하지 않습니다.",
      },
      methods: ["DELETE", "GET"],
    },
    {
      name: "network then network",
      outcomes: [{ error: network }, { error: network }],
      expected: {
        kind: "unknown",
        message: "삭제 결과를 확인할 수 없습니다. 상태를 다시 확인하거나 목록으로 이동해주세요.",
      },
      methods: ["DELETE", "GET"],
    },
    {
      name: "invalid response then invalid response",
      outcomes: [{ error: invalid }, { error: invalid }],
      expected: {
        kind: "unknown",
        message: "삭제 결과를 확인할 수 없습니다. 상태를 다시 확인하거나 목록으로 이동해주세요.",
      },
      methods: ["DELETE", "GET"],
    },
    {
      name: "aborted",
      outcomes: [{ error: aborted }],
      expected: { kind: "stale" },
      methods: ["DELETE"],
    },
  ])(
    "resolves $name without an automatic DELETE retry",
    async ({ outcomes, expected, methods }) => {
      const actualMethods: string[] = [];

      await expect(
        resolveDeleteAttempt(clientFor([...outcomes], actualMethods), "task-1"),
      ).resolves.toEqual(expected);
      expect(actualMethods).toEqual(methods);
      expect(actualMethods.filter((method) => method === "DELETE")).toHaveLength(1);
    },
  );
});

describe("recheckTaskPresence", () => {
  it.each([
    {
      name: "GET 200",
      outcome: { body: detail },
      expected: {
        kind: "exists",
        message: "할 일이 존재합니다. 삭제를 다시 시도할 수 있습니다.",
      },
    },
    {
      name: "GET 404",
      outcome: { error: http404() },
      expected: {
        kind: "absent",
        message: "할 일이 현재 존재하지 않습니다. 삭제 성공으로 판정하지 않습니다.",
      },
    },
    {
      name: "network",
      outcome: { error: network },
      expected: {
        kind: "unknown",
        message: "삭제 결과를 확인할 수 없습니다. 상태를 다시 확인하거나 목록으로 이동해주세요.",
      },
    },
    {
      name: "invalid response",
      outcome: { error: invalid },
      expected: {
        kind: "unknown",
        message: "삭제 결과를 확인할 수 없습니다. 상태를 다시 확인하거나 목록으로 이동해주세요.",
      },
    },
    { name: "aborted", outcome: { error: aborted }, expected: { kind: "stale" } },
  ])("resolves $name without DELETE", async ({ outcome, expected }) => {
    const methods: string[] = [];

    await expect(recheckTaskPresence(clientFor([outcome], methods), "task-1")).resolves.toEqual(
      expected,
    );
    expect(methods).toEqual(["GET"]);
  });
});
