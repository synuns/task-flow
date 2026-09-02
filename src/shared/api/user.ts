import type { components } from "@/generated/openapi";
import type { ApiClient } from "./api-client-context";
import { hasExactKeys } from "./request";

type GeneratedUserResponse = components["schemas"]["UserResponse"];
export type UserProfileData = { name: string; memo: string };

function isUserProfile(value: unknown): value is GeneratedUserResponse {
  return (
    hasExactKeys(value, ["name", "memo"]) &&
    typeof value.name === "string" &&
    typeof value.memo === "string"
  );
}

export function getUser(client: ApiClient, signal?: AbortSignal): Promise<UserProfileData> {
  const url = new URL("/api/user", globalThis.location?.origin ?? "http://localhost");
  return client.request(url, { method: "GET", signal }, isUserProfile);
}
