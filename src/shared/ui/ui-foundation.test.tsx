import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button, Card, CardContent, Input, Label } from ".";

afterEach(cleanup);

function renderFoundation() {
  render(
    <Card data-testid="foundation-surface">
      <CardContent>
        <Label htmlFor="foundation-email">이메일</Label>
        <Input
          aria-describedby="foundation-email-error"
          aria-invalid="true"
          id="foundation-email"
          type="email"
        />
        <p id="foundation-email-error">이메일 형식을 확인해주세요.</p>
        <Button disabled type="button">
          저장
        </Button>
      </CardContent>
    </Card>,
  );
}

describe("UI foundation contract", () => {
  it("preserves label, error description, and disabled semantics", () => {
    renderFoundation();

    const input = screen.getByRole("textbox", { name: "이메일" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("이메일 형식을 확인해주세요.");
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("uses semantic tokens for surface, focus, disabled, and error styles", () => {
    renderFoundation();

    expect(screen.getByTestId("foundation-surface")).toHaveClass(
      "border",
      "bg-card",
      "text-card-foreground",
    );
    expect(screen.getByRole("textbox", { name: "이메일" })).toHaveClass(
      "border-input",
      "focus-visible:ring-ring/50",
      "aria-invalid:border-destructive",
    );
    expect(screen.getByRole("button", { name: "저장" })).toHaveClass(
      "focus-visible:ring-ring/50",
      "disabled:opacity-50",
    );
  });
});
