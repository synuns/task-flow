import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "./route-error-boundary";
import { appRoutes } from "./router";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("app router", () => {
  it.each([
    ["/", "대시보드"],
    ["/sign-in", "로그인"],
    ["/task", "할 일"],
    ["/task/task-1", "할 일 상세"],
    ["/user", "회원정보"],
  ])("resolves %s to its page boundary", async (path, heading) => {
    const router = createMemoryRouter(appRoutes, { initialEntries: [path] });

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "할 일" })).toHaveAttribute("href", "/task");
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
