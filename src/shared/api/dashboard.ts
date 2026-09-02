import type { components } from "@/generated/openapi";
import type { ApiClient } from "./api-client-context";
import { hasExactKeys } from "./request";

type GeneratedDashboardResponse = components["schemas"]["DashboardResponse"];
export type DashboardMetrics = {
  numOfTask: number;
  numOfRestTask: number;
  numOfDoneTask: number;
};

function isDashboardMetrics(value: unknown): value is GeneratedDashboardResponse {
  return (
    hasExactKeys(value, ["numOfTask", "numOfRestTask", "numOfDoneTask"]) &&
    Number.isInteger(value.numOfTask) &&
    Number.isInteger(value.numOfRestTask) &&
    Number.isInteger(value.numOfDoneTask)
  );
}

export function getDashboard(client: ApiClient, signal?: AbortSignal): Promise<DashboardMetrics> {
  const url = new URL("/api/dashboard", globalThis.location?.origin ?? "http://localhost");
  return client.request(url, { method: "GET", signal }, isDashboardMetrics);
}
