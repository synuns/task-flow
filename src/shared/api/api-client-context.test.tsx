import { cleanup, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiClient, ApiClientProvider, useApiClient } from "./api-client-context";

afterEach(cleanup);

describe("ApiClientProvider", () => {
  it("provides the injected auth-agnostic client", () => {
    const client: ApiClient = { request: vi.fn() };
    const wrapper = ({ children }: PropsWithChildren) => (
      <ApiClientProvider client={client}>{children}</ApiClientProvider>
    );

    const { result } = renderHook(() => useApiClient(), { wrapper });

    expect(result.current).toBe(client);
  });

  it("fails clearly outside the provider", () => {
    expect(() => renderHook(() => useApiClient())).toThrow("ApiClientProvider is missing");
  });
});
