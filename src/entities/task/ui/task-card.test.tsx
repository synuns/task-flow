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
    expect(link).toHaveTextContent("삭제 검증 대상");
    expect(link).toHaveAttribute("href", "/task/task%2FA");
    expect(screen.queryByText("TODO")).not.toBeInTheDocument();
  });
});
