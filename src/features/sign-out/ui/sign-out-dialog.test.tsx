import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignOutDialog } from "./sign-out-dialog";

afterEach(cleanup);

describe("SignOutDialog", () => {
  it("focuses cancel and returns focus without a request", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    render(<SignOutDialog onSignOut={onSignOut} />);
    const trigger = screen.getByRole("button", { name: "로그아웃" });

    await user.click(trigger);
    const dialog = screen.getByRole("alertdialog", { name: "로그아웃하시겠어요?" });
    const cancel = within(dialog).getByRole("button", { name: "취소" });
    expect(cancel).toHaveFocus();
    await user.click(cancel);

    expect(onSignOut).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("locks duplicate actions and preserves the dialog after failure", async () => {
    const user = userEvent.setup();
    let reject: (reason: unknown) => void = () => undefined;
    const onSignOut = vi.fn(
      () =>
        new Promise<void>((_resolve, rejectPromise) => {
          reject = rejectPromise;
        }),
    );
    render(<SignOutDialog onSignOut={onSignOut} />);

    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    const dialog = screen.getByRole("alertdialog", { name: "로그아웃하시겠어요?" });
    await user.click(within(dialog).getByRole("button", { name: "로그아웃" }));

    expect(within(dialog).getByRole("button", { name: "로그아웃 중" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled();
    expect(onSignOut).toHaveBeenCalledTimes(1);

    reject({ message: "로그아웃 요청을 처리하지 못했습니다." });

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "로그아웃 요청을 처리하지 못했습니다.",
    );
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "취소" })).toBeEnabled());
    expect(screen.getByRole("alertdialog", { name: "로그아웃하시겠어요?" })).toBeInTheDocument();
  });
});
