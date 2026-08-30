import { ApiClientProvider, type ApiClient } from "@/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthController, AuthStatus } from "./auth/auth-provider";
import { RouteErrorBoundary } from "./route-error-boundary";
import { appRoutes } from "./router";

const auth = vi.hoisted(() => ({ controller: null as AuthController | null }));
vi.mock("./auth/auth-provider", () => ({
  useAuth: () => {
    if (!auth.controller) throw new Error("test auth controller is missing");
    return auth.controller;
  },
}));

function controller(status: AuthStatus): AuthController {
  return {
    status,
    getSnapshot: vi.fn(() => ({ generation: 1, accessToken: null })),
    acceptSignIn: vi.fn(),
    refresh: vi.fn(),
    terminate: vi.fn(),
    retryBootstrap: vi.fn(),
  };
}

const apiClient: ApiClient = {
  request: async <T,>(
    input: RequestInfo | URL,
    _init: RequestInit,
    isSuccess: (value: unknown) => value is T,
  ) => {
    const pathname = new URL(String(input)).pathname;
    const body: unknown =
      pathname === "/api/dashboard"
        ? { numOfTask: 3, numOfRestTask: 2, numOfDoneTask: 1 }
        : pathname === "/api/user"
          ? { name: "김담당", memo: "오늘도 차근차근" }
          : {};
    if (!isSuccess(body)) throw new Error("router test API fixture is missing");
    return body;
  },
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  auth.controller = null;
});

describe("app router", () => {
  it.each([
    ["/", "대시보드", "authenticated"],
    ["/sign-in", "로그인", "anonymous"],
    ["/task", "할 일", "authenticated"],
    ["/task/task-1", "할 일 상세", "authenticated"],
    ["/user", "회원정보", "authenticated"],
  ])("resolves %s to its auth-aware page boundary", async (path, heading, kind) => {
    auth.controller = controller(
      kind === "authenticated"
        ? { kind, generation: 1, accessToken: "token", userId: "user-1" }
        : { kind: "anonymous" },
    );
    const router = createMemoryRouter(appRoutes, { initialEntries: [path] });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ApiClientProvider client={apiClient}>
          <RouterProvider router={router} />
        </ApiClientProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "할 일" })).toHaveAttribute("href", "/task");
    if (kind === "authenticated") {
      expect(screen.getByRole("link", { name: "회원정보" })).toHaveAttribute("href", "/user");
      expect(screen.queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/sign-in");
      expect(screen.queryByRole("link", { name: "회원정보" })).not.toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "이메일" })).toBeInTheDocument();
    }
  });

  it("renders the route error boundary for render failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    function BrokenPage(): never {
      throw new Error("render failure");
    }
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <BrokenPage />,
          errorElement: <RouteErrorBoundary />,
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("화면을 불러오지 못했습니다");
  });
});
