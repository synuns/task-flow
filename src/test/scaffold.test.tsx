import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("frontend test scaffold", () => {
  it("renders with jsdom and supports user interaction", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <button type="button" onClick={onClick}>
        scaffold
      </button>,
    );

    await user.click(screen.getByRole("button", { name: "scaffold" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
