import { taskKeys } from "@/entities/task";
import { resetAuthFixture, startAuthSession } from "@/mocks/fixtures/auth";
import { authHandlers } from "@/mocks/handlers/auth";
import { server } from "@/mocks/server";
import { type ApiClient, useApiClient } from "@/shared/api";
import { TaskList } from "@/widgets/task-list";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { type AuthController, AuthProvider, useAuth } from "./auth-provider";
import { AuthRouteBoundary } from "./auth-route-boundary";
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

it("ends the session, clears task cache, and recovers the route after task 401 replay", async () => {
  let taskRequests = 0;
  let refreshRequests = 0;
  server.use(
    http.get("/api/task", ({ request }) => {
      taskRequests += 1;
      expect(request.headers.get("Authorization")).toMatch(/^Bearer /);
      return HttpResponse.json({ errorMessage: "인증이 필요합니다." }, { status: 401 });
    }),
    http.post("/api/refresh", () => {
      refreshRequests += 1;
      return HttpResponse.json(
        { errorMessage: "인증 정보를 갱신할 수 없습니다." },
        { status: 401 },
      );
    }),
  );

  const observed: { auth: AuthController | null } = { auth: null };
  function Probe() {
    observed.auth = useAuth();
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        element: <AuthRouteBoundary />,
        children: [
          { path: "/sign-in", element: <h1>로그인</h1> },
          { path: "/task", element: <TaskList /> },
        ],
      },
    ],
    { initialEntries: ["/task"] },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData([...taskKeys.all, "stale"], { protected: true });
  queryClient.setQueryData(["unrelated"], { keep: true });

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider queryClient={queryClient}>
        <AuthenticatedApiBridge>
          <Probe />
          <RouterProvider router={router} />
        </AuthenticatedApiBridge>
      </AuthProvider>
    </QueryClientProvider>,
  );
  await screen.findByRole("heading", { name: "로그인" });
  if (!observed.auth) throw new Error("auth controller is missing");
  const activeController = observed.auth;

  act(() => activeController.acceptSignIn(startAuthSession()));

  await waitFor(() => expect(taskRequests).toBe(1));
  await waitFor(() => expect(observed.auth?.status.kind).toBe("anonymous"));
  expect(refreshRequests).toBe(2);
  expect(router.state.location.pathname).toBe("/sign-in");
  expect(router.state.location.state).toEqual({ returnTo: "/task" });
  expect(queryClient.getQueryData([...taskKeys.all, "stale"])).toBeUndefined();
  expect(queryClient.getQueryData(["unrelated"])).toEqual({ keep: true });
});
