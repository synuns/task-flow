import type { components } from "@/generated/crud-openapi";
import type { ApiClient } from "./api-client-context";
import { hasExactKeys, requestJson } from "./request";

type GeneratedCreateUserInput = components["schemas"]["CreateUserRequest"];
type GeneratedUpdateUserInput = components["schemas"]["UpdateUserRequest"];
type GeneratedUserResponse = components["schemas"]["UserResponse"];
type GeneratedDeleteUserResponse = components["schemas"]["DeleteUserResponse"];

export type CreateUserInput = GeneratedCreateUserInput;
export type UpdateUserInput = GeneratedUpdateUserInput;
export type UserProfileData = GeneratedUserResponse;
export type DeleteUserResult = GeneratedDeleteUserResponse;

function isUser(value: unknown): value is GeneratedUserResponse {
  return (
    hasExactKeys(value, ["email", "name", "memo"]) &&
    typeof value.email === "string" &&
    typeof value.name === "string" &&
    typeof value.memo === "string"
  );
}

function isDeleteUserResult(value: unknown): value is GeneratedDeleteUserResponse {
  return hasExactKeys(value, ["success"]) && value.success === true;
}

const userUrl = () => new URL("/api/user", globalThis.location?.origin ?? "http://localhost");
const jsonHeaders = { "Content-Type": "application/json" };

export function createUser(input: CreateUserInput): Promise<UserProfileData> {
  return requestJson(
    userUrl(),
    { method: "POST", headers: jsonHeaders, body: JSON.stringify(input) },
    isUser,
  );
}

export function getUser(client: ApiClient, signal?: AbortSignal): Promise<UserProfileData> {
  return client.request(userUrl(), { method: "GET", signal }, isUser);
}

export function updateUser(client: ApiClient, input: UpdateUserInput): Promise<UserProfileData> {
  return client.request(
    userUrl(),
    { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(input) },
    isUser,
  );
}

export function deleteUser(client: ApiClient, password: string): Promise<DeleteUserResult> {
  return client.request(
    userUrl(),
    { method: "DELETE", headers: jsonHeaders, body: JSON.stringify({ password }) },
    isDeleteUserResult,
  );
}
