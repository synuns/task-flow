import { resetAuthFixture, startAuthSession } from "@/mocks/fixtures/auth";
import { authHandlers } from "@/mocks/handlers/auth";
import { server } from "@/mocks/server";
import { type ApiClient, useApiClient } from "@/shared/api";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { type AuthController, AuthProvider, useAuth } from "./auth-provider";
import { AuthenticatedApiBridge } from "./authenticated-api-bridge";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(async () => {
  server.resetHandlers(...authHandlers);
  resetAuthFixture();
  await fetch(new URL("/api/refresh", globalThis.location.origin), {
    method: "POST",
    credentials: "include",
  });
  resetAuthFixture();
});
afterEach(cleanup);
afterAll(() => server.close());

it("keeps one ApiClient instance while auth tokens rotate", async () => {
  const observed: { auth: AuthController | null; client: ApiClient | null } = {
    auth: null,
    client: null,
  };
  function Probe() {
    observed.auth = useAuth();
    observed.client = useApiClient();
    return <p>{observed.auth.status.kind}</p>;
  }
  const queryClient = new QueryClient();
  render(
    <AuthProvider queryClient={queryClient}>
      <AuthenticatedApiBridge>
        <Probe />
      </AuthenticatedApiBridge>
    </AuthProvider>,
  );
  await screen.findByText("anonymous");
  const firstClient = observed.client;
  if (!observed.auth) throw new Error("auth controller is missing");

  observed.auth.acceptSignIn(startAuthSession());

  await waitFor(() => expect(screen.getByText("authenticated")).toBeInTheDocument());
  expect(observed.client).toBe(firstClient);
});
