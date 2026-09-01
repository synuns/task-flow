import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AppShell } from "./index";

describe("AppShell", () => {
  afterEach(cleanup);

  it("keeps primary navigation and its keyboard tab order", async () => {
    const router = createMemoryRouter(
      [
        {
          element: <AppShell authAction={{ kind: "sign-in", to: "/sign-in" }} />,
          children: [{ path: "/task", element: <h1>할 일</h1> }],
        },
      ],
      { initialEntries: ["/task"] },
    );

    render(<RouterProvider router={router} />);

    const user = userEvent.setup();
    expect(await screen.findByRole("heading", { name: "할 일" })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "주요 메뉴" });
    for (const icon of ["lucide-layout-dashboard", "lucide-list-todo", "lucide-log-in"]) {
      expect(navigation.querySelector(`.${icon}`)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "할 일" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/sign-in");
    await user.tab();
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "할 일" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveFocus();
  });

  it("shows exactly the supplied authenticated action", async () => {
    const router = createMemoryRouter(
      [
        {
          element: <AppShell authAction={{ kind: "profile", to: "/user" }} />,
          children: [{ path: "/user", element: <h1>회원정보</h1> }],
        },
      ],
      { initialEntries: ["/user"] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "회원정보" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "회원정보" })).toHaveAttribute("href", "/user");
    expect(screen.queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
  });
});
