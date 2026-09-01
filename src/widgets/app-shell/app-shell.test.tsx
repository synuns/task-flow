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
    for (const [label, icon] of [
      ["대시보드", "lucide-layout-dashboard"],
      ["할 일", "lucide-list-todo"],
      ["로그인", "lucide-log-in"],
    ]) {
      const iconElement = screen.getByRole("link", { name: label }).querySelector(`.${icon}`);
      expect(iconElement).toBeInTheDocument();
      expect(iconElement).toHaveAttribute("height", "20");
      expect(iconElement).toHaveAttribute("width", "20");
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
    const profileLink = screen.getByRole("link", { name: "회원정보" });
    expect(profileLink).toHaveAttribute("href", "/user");
    const profileIcon = profileLink.querySelector(".lucide-circle-user-round");
    expect(profileIcon).toBeInTheDocument();
    expect(profileIcon).toHaveAttribute("height", "20");
    expect(profileIcon).toHaveAttribute("width", "20");
    expect(screen.queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
  });
});
