import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AsyncError, AsyncLoading } from "./async-state";

describe("async state", () => {
  it("announces loading with the supplied message", () => {
    render(
      <AsyncLoading message="업무 현황을 불러오고 있습니다.">
        <div data-testid="placeholder" />
      </AsyncLoading>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("업무 현황을 불러오고 있습니다.");
    expect(screen.getByTestId("placeholder")).toBeInTheDocument();
  });

  it("presents a recoverable error and invokes retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <AsyncError
        message="네트워크 요청에 실패했습니다."
        onRetry={onRetry}
        title="업무 현황을 불러오지 못했습니다."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("네트워크 요청에 실패했습니다.");
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
