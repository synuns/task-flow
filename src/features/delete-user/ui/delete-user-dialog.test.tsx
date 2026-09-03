import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteUserDialog } from "./delete-user-dialog";

function renderDialog(onDelete = vi.fn()) {
  return render(<DeleteUserDialog onDelete={onDelete} />);
}

afterEach(cleanup);

describe("DeleteUserDialog", () => {
  it("requires a password and cancels without sending a request", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderDialog(onDelete);

    const trigger = screen.getByRole("button", { name: "회원 탈퇴" });
    await user.click(trigger);

    expect(screen.getByRole("alertdialog", { name: "회원 탈퇴" })).toBeInTheDocument();
    expect(screen.getByLabelText("현재 비밀번호")).toBeRequired();
    expect(screen.getByLabelText("현재 비밀번호")).toHaveFocus();
    expect(screen.getByRole("button", { name: "탈퇴 확인" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("alertdialog", { name: "회원 탈퇴" })).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("keeps the dialog and session after a wrong password", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockRejectedValue({
      kind: "http",
      status: 400,
      message: "현재 비밀번호가 올바르지 않습니다.",
    });
    renderDialog(onDelete);

    await user.click(screen.getByRole("button", { name: "회원 탈퇴" }));
    await user.type(screen.getByLabelText("현재 비밀번호"), "Wrong123");
    await user.click(screen.getByRole("button", { name: "탈퇴 확인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "현재 비밀번호가 올바르지 않습니다.",
    );
    expect(screen.getByRole("alertdialog", { name: "회원 탈퇴" })).toBeInTheDocument();
    expect(screen.getByLabelText("현재 비밀번호")).toHaveValue("Wrong123");
    expect(onDelete).toHaveBeenCalledWith("Wrong123");
  });

  it("locks duplicate actions until deletion succeeds", async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const onDelete = vi.fn(async () => pending);
    renderDialog(onDelete);

    await user.click(screen.getByRole("button", { name: "회원 탈퇴" }));
    await user.type(screen.getByLabelText("현재 비밀번호"), "Password1");
    await user.click(screen.getByRole("button", { name: "탈퇴 확인" }));

    expect(screen.getByRole("button", { name: "탈퇴 확인" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("Password1");

    release();

    await waitFor(() => expect(screen.getByRole("button", { name: "취소" })).toBeEnabled());
  });
});
