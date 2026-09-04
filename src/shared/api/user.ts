import type { components } from "@/generated/crud-openapi";
import { z } from "zod";
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

const userSchema = z.strictObject({
  email: z.email().max(254),
  name: z.string().max(50),
  memo: z.string().max(500),
});

function isUser(value: unknown): value is GeneratedUserResponse {
  return userSchema.safeParse(value).success;
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
