import type { components } from "@/generated/openapi";
import type { ApiError } from "./api-error";

type ErrorResponse = components["schemas"]["ErrorResponse"];
type Guard<T> = (value: unknown) => value is T;

function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).errorMessage === "string"
  );
}

function invalidResponse(status: number): ApiError {
  return {
    kind: "invalid-response",
    status,
    message: "API 응답 형식이 올바르지 않습니다.",
  };
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  isSuccess: Guard<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw { kind: "aborted", message: "요청이 취소되었습니다." } satisfies ApiError;
    }
    throw { kind: "network", message: "네트워크 요청에 실패했습니다." } satisfies ApiError;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw invalidResponse(response.status);
  }

  if (!response.ok) {
    if (isErrorResponse(body)) {
      throw {
        kind: "http",
        status: response.status,
        message: body.errorMessage,
      } satisfies ApiError;
    }
    throw invalidResponse(response.status);
  }

  if (!isSuccess(body)) {
    throw invalidResponse(response.status);
  }

  return body;
}
