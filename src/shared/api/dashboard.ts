import type { components } from "@/generated/openapi";
import type { ApiClient } from "./api-client-context";

type GeneratedDashboardResponse = components["schemas"]["DashboardResponse"];
export type DashboardMetrics = {
  numOfTask: number;
  numOfRestTask: number;
  numOfDoneTask: number;
};

function isDashboardMetrics(value: unknown): value is GeneratedDashboardResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    Number.isInteger(data.numOfTask) &&
    Number.isInteger(data.numOfRestTask) &&
    Number.isInteger(data.numOfDoneTask)
  );
}

export function getDashboard(client: ApiClient): Promise<DashboardMetrics> {
  const url = new URL("/api/dashboard", globalThis.location?.origin ?? "http://localhost");
  return client.request(url, { method: "GET" }, isDashboardMetrics);
}
