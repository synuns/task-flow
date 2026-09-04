export type ApiError =
  | { kind: "http"; status: number; message: string }
  | { kind: "invalid-response"; status: number; message: string }
  | { kind: "network"; message: string }
  | { kind: "aborted"; message: string };

export function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== "object") return false;
  const error = value as { kind?: unknown; status?: unknown; message?: unknown };
  if (typeof error.message !== "string") return false;
  if (error.kind === "network" || error.kind === "aborted") return true;
  return (
    (error.kind === "http" || error.kind === "invalid-response") && Number.isInteger(error.status)
  );
}
