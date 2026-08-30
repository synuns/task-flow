import type { components } from "@/generated/openapi";
import { requestJson } from "./request";

type GeneratedAuthTokenResponse = components["schemas"]["AuthTokenResponse"];
export type AuthTokenPair = { accessToken: string; refreshToken: string };
export type SignInCredentials = { email: string; password: string };

function apiUrl(path: string): URL {
  return new URL(path, globalThis.location?.origin ?? "http://localhost");
}

function isAuthTokenPair(value: unknown): value is GeneratedAuthTokenResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return typeof data.accessToken === "string" && typeof data.refreshToken === "string";
}

export function signIn(credentials: SignInCredentials): Promise<AuthTokenPair> {
  return requestJson(
    apiUrl("/api/sign-in"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    },
    isAuthTokenPair,
  );
}

export function refreshAccessToken(): Promise<AuthTokenPair> {
  return requestJson(
    apiUrl("/api/refresh"),
    { method: "POST", credentials: "include" },
    isAuthTokenPair,
  );
}
