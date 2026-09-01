import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TaskCard } from "./task-card";

describe("TaskCard", () => {
  it("shows title and memo and links the response ID to its detail route", () => {
    render(
      <MemoryRouter>
        <TaskCard id="task/A" memo="삭제 검증 대상" title="첫 번째 할 일" />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /첫 번째 할 일/ });
    const title = screen.getByRole("heading", { name: "첫 번째 할 일" });
    const memo = screen.getByText("삭제 검증 대상");
    expect(link.querySelector('[data-slot="card"]')).toBeInTheDocument();
    expect(link).toHaveTextContent("삭제 검증 대상");
    expect(link).toHaveAttribute("href", "/task/task%2FA");
    expect(title).toHaveClass("break-words");
    expect(title).not.toHaveClass("truncate");
    expect(memo).toHaveClass("break-words");
    expect(memo).not.toHaveClass("truncate");
    expect(screen.queryByText("TODO")).not.toBeInTheDocument();
  });
});
