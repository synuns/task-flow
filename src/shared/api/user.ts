import type { components } from "@/generated/openapi";
import type { ApiClient } from "./api-client-context";

type GeneratedUserResponse = components["schemas"]["UserResponse"];
export type UserProfileData = { name: string; memo: string };

function isUserProfile(value: unknown): value is GeneratedUserResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return typeof data.name === "string" && typeof data.memo === "string";
}

export function getUser(client: ApiClient): Promise<UserProfileData> {
  const url = new URL("/api/user", globalThis.location?.origin ?? "http://localhost");
  return client.request(url, { method: "GET" }, isUserProfile);
}
