import { render, screen } from "@testing-library/react";
import type { ComponentType, PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";

type Primitive = ComponentType<PropsWithChildren<Record<string, unknown>>>;

describe("shadcn primitive integration", () => {
  it("exports a semantic button and an accessible controlled dialog", async () => {
    const primitives = (await import(".")) as Record<string, unknown>;

    expect(primitives).toHaveProperty("Button");
    expect(primitives).toHaveProperty("Dialog");
    expect(primitives).toHaveProperty("DialogContent");
    expect(primitives).toHaveProperty("DialogDescription");
    expect(primitives).toHaveProperty("DialogTitle");

    const Button = primitives.Button as Primitive;
    const Dialog = primitives.Dialog as Primitive;
    const DialogContent = primitives.DialogContent as Primitive;
    const DialogDescription = primitives.DialogDescription as Primitive;
    const DialogTitle = primitives.DialogTitle as Primitive;

    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>확인</DialogTitle>
          <DialogDescription>계속 진행합니다.</DialogDescription>
          <Button>닫기</Button>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("button", { name: "닫기" })).toHaveAttribute("data-slot", "button");
    expect(screen.getByRole("dialog", { name: "확인" })).toHaveAccessibleDescription(
      "계속 진행합니다.",
    );
  });
});
