import { ApiClientProvider, type ApiClient } from "@/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
        : pathname === "/api/sign-out"
          ? { success: true }
          : pathname === "/api/user"
            ? { email: "user@example.com", name: "김담당", memo: "오늘도 차근차근" }
            : pathname === "/api/task/task-1"
              ? {
                  title: "첫 번째 할 일",
                  memo: "삭제 검증 대상",
                  status: "TODO",
                  registerDatetime: "2026-08-30T09:00:00.000Z",
                }
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
    ["/sign-up", "회원가입", "anonymous"],
    ["/task", "할 일", "authenticated"],
    ["/task/task-1", "첫 번째 할 일", "authenticated"],
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
    const navigation = screen.getByRole("navigation", { name: "주요 메뉴" });
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(navigation.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(3);
    expect(screen.getByText("업무 관리")).toBeInTheDocument();
    expect(screen.queryByText("오늘의 목표에 집중하세요.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "할 일" })).toHaveAttribute("href", "/task");
    if (kind === "authenticated") {
      expect(screen.getByRole("link", { name: "회원정보" })).toHaveAttribute("href", "/user");
      expect(screen.queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
    } else {
      expect(within(navigation).getByRole("link", { name: "로그인" })).toHaveAttribute(
        "href",
        "/sign-in",
      );
      expect(screen.queryByRole("link", { name: "회원정보" })).not.toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "이메일" })).toBeInTheDocument();
      expect(navigation).not.toHaveTextContent("회원가입");
      if (path === "/sign-in") {
        expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/sign-up");
      }
    }

    if (path !== "/sign-up") {
      const currentLabel = path.startsWith("/task") ? "할 일" : heading;
      const currentLink = screen.getByRole("link", { name: currentLabel });
      expect(currentLink).toHaveAttribute("aria-current", "page");
      expect(currentLink).toHaveClass("bg-primary/35");
    }
  });

  it("keeps the application shell while bootstrap blocks protected content", () => {
    auth.controller = controller({ kind: "initializing" });
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/task"] });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ApiClientProvider client={apiClient}>
          <RouterProvider router={router} />
        </ApiClientProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("인증 상태를 확인하고 있습니다.");
    expect(screen.queryByRole("heading", { name: "할 일" })).not.toBeInTheDocument();
  });

  it("terminates the captured session only after sign-out succeeds", async () => {
    const user = userEvent.setup();
    const active = controller({
      kind: "authenticated",
      generation: 1,
      accessToken: "token",
      userId: "user-1",
    });
    active.getSnapshot = vi.fn(() => ({ generation: 1, accessToken: "token" }));
    active.terminate = vi.fn(() => {
      active.status = { kind: "anonymous" };
    });
    auth.controller = active;
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/user"] });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ApiClientProvider client={apiClient}>
          <RouterProvider router={router} />
        </ApiClientProvider>
      </QueryClientProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "로그아웃" }));
    const dialog = screen.getByRole("alertdialog", { name: "로그아웃하시겠어요?" });
    await user.click(within(dialog).getByRole("button", { name: "로그아웃" }));

    expect(await screen.findByRole("heading", { name: "로그인" })).toBeInTheDocument();
    expect(active.terminate).toHaveBeenCalledWith({ generation: 1, accessToken: "token" });
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
