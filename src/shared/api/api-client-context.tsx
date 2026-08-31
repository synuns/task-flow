import { createContext, type PropsWithChildren, useContext } from "react";
import type { AuthenticatedRequest } from "./authenticated-request";

export type ApiClient = { request: AuthenticatedRequest };
const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({ client, children }: PropsWithChildren<{ client: ApiClient }>) {
  return <ApiClientContext value={client}>{children}</ApiClientContext>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error("ApiClientProvider is missing");
  return client;
}
