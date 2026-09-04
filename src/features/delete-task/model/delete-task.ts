import { type ApiClient, type ApiError, deleteTask, getTaskDetail, isApiError } from "@/shared/api";

export type DeleteResolution =
  | { kind: "success" }
  | { kind: "exists"; message: string }
  | { kind: "absent"; message: string }
  | { kind: "unknown"; message: string }
  | { kind: "failure"; message: string }
  | { kind: "stale" };

export type PresenceResolution = Exclude<DeleteResolution, { kind: "success" }>;

function isUnknownOutcome(error: ApiError): boolean {
  return error.kind === "network" || error.kind === "invalid-response";
}

export async function recheckTaskPresence(
  client: ApiClient,
  id: string,
): Promise<PresenceResolution> {
  try {
    await getTaskDetail(client, id);
    return { kind: "exists", message: "할 일이 존재합니다. 삭제를 다시 시도할 수 있습니다." };
  } catch (value) {
    if (!isApiError(value)) throw value;
    if (value.kind === "aborted") return { kind: "stale" };
    if (value.kind === "http" && value.status === 404) {
      return {
        kind: "absent",
        message: "할 일이 현재 존재하지 않습니다. 삭제 성공으로 판정하지 않습니다.",
      };
    }
    if (isUnknownOutcome(value)) {
      return {
        kind: "unknown",
        message: "삭제 결과를 확인할 수 없습니다. 상태를 다시 확인하거나 목록으로 이동해주세요.",
      };
    }
    return { kind: "failure", message: value.message };
  }
}

export async function resolveDeleteAttempt(
  client: ApiClient,
  id: string,
): Promise<DeleteResolution> {
  try {
    await deleteTask(client, id);
    return { kind: "success" };
  } catch (value) {
    if (!isApiError(value)) throw value;
    if (value.kind === "aborted") return { kind: "stale" };
    if (value.kind === "http" && value.status === 404) {
      return { kind: "absent", message: value.message };
    }
    if (!isUnknownOutcome(value)) return { kind: "failure", message: value.message };
  }

  return recheckTaskPresence(client, id);
}
