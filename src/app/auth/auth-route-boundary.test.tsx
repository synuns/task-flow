import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  useLocation,
  type RouteObject,
} from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthRouteBoundary } from "./auth-route-boundary";
import type { AuthController, AuthStatus } from "./auth-provider";

const auth = vi.hoisted(() => ({ controller: null as AuthController | null }));
vi.mock("./auth-provider", () => ({
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
    retryBootstrap: vi.fn(async () => undefined),
  };
}

function LocationProbe() {
  const location = useLocation();
  return (
    <>
      <p data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</p>
      <p data-testid="return-to">
        {(location.state as { returnTo?: string } | null)?.returnTo ?? "none"}
      </p>
      <Outlet />
    </>
  );
}

const routes: RouteObject[] = [
  {
    element: <AuthRouteBoundary />,
    children: [
      {
        element: <LocationProbe />,
        children: [
          { path: "/sign-in", element: <h1>로그인</h1> },
          { path: "/sign-up", element: <h1>회원가입</h1> },
          { path: "/", element: <h1>대시보드</h1> },
          { path: "/task", element: <h1>할 일</h1> },
          { path: "/task/:id", element: <h1>할 일 상세</h1> },
          { path: "/user", element: <h1>회원정보</h1> },
        ],
      },
    ],
  },
];

afterEach(() => {
  cleanup();
  auth.controller = null;
});

describe("AuthRouteBoundary", () => {
  it("does not render protected content while bootstrap is initializing", () => {
    auth.controller = controller({ kind: "initializing" });
    const router = createMemoryRouter(routes, { initialEntries: ["/task"] });
    render(<RouterProvider router={router} />);

    expect(screen.getByRole("status")).toHaveTextContent("인증 상태를 확인하고 있습니다.");
    expect(screen.getByRole("status").querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "할 일" })).not.toBeInTheDocument();
  });

  it("preserves an internal return path when anonymous enters a protected route", async () => {
    auth.controller = controller({ kind: "anonymous" });
    const router = createMemoryRouter(routes, {
      initialEntries: ["/task/task%2FA?tab=memo#content"],
    });
    render(<RouterProvider router={router} />);

    expect(await screen.findByTestId("location")).toHaveTextContent("/sign-in");
    expect(screen.getByTestId("return-to")).toHaveTextContent("/task/task%2FA?tab=memo#content");
  });

  it.each([
    ["https://evil.test/task", "/"],
    ["/sign-in", "/"],
    ["/unknown", "/"],
    ["/task/task-1?from=login", "/task/task-1?from=login"],
    ["/task/task%2FA?from=login", "/task/task%2FA?from=login"],
  ])("validates an authenticated sign-in return target %s", async (returnTo, expected) => {
    auth.controller = controller({
      kind: "authenticated",
      generation: 1,
      accessToken: "token",
      userId: "user-1",
    });
    const router = createMemoryRouter(routes, {
      initialEntries: [{ pathname: "/sign-in", state: { returnTo } }],
    });
    render(<RouterProvider router={router} />);

    expect(await screen.findByTestId("location")).toHaveTextContent(expected);
  });

  it("redirects an authenticated user away from sign-up", async () => {
    auth.controller = controller({
      kind: "authenticated",
      generation: 1,
      accessToken: "token",
      userId: "user-1",
    });
    const router = createMemoryRouter(routes, { initialEntries: ["/sign-up"] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByTestId("location")).toHaveTextContent("/");
  });

  it("exposes retry without treating unavailable as anonymous", async () => {
    const user = userEvent.setup();
    const retryBootstrap = vi.fn(async () => undefined);
    auth.controller = {
      ...controller({ kind: "unavailable", message: "offline" }),
      retryBootstrap,
    };
    const router = createMemoryRouter(routes, { initialEntries: ["/task"] });
    render(<RouterProvider router={router} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-slot", "alert");
    expect(alert).toHaveTextContent("인증 상태를 확인하지 못했습니다.");
    expect(alert).toHaveTextContent("offline");
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(retryBootstrap).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "로그인" })).not.toBeInTheDocument();
  });
});
