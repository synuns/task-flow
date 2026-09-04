import { ApiClientProvider, type ApiClient } from "@/shared/api";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteTaskDialog } from "./delete-task-dialog";

const resolution = vi.hoisted(() => ({
  resolve: vi.fn(),
  recheck: vi.fn(),
}));

vi.mock("../model/delete-task", () => ({
  resolveDeleteAttempt: resolution.resolve,
  recheckTaskPresence: resolution.recheck,
}));

const client: ApiClient = {
  request: async () => {
    throw new Error("mocked resolution service should own requests");
  },
};

function renderDialog(
  taskId = "task-1",
  onSuccess = vi.fn(),
  onAbsent = vi.fn(),
  onPendingChange = vi.fn(),
) {
  render(
    <MemoryRouter>
      <ApiClientProvider client={client}>
        <DeleteTaskDialog
          disabled={false}
          onAbsent={onAbsent}
          onPendingChange={onPendingChange}
          onSuccess={onSuccess}
          taskId={taskId}
        />
      </ApiClientProvider>
    </MemoryRouter>,
  );
  return { onSuccess, onAbsent, onPendingChange };
}

afterEach(() => {
  cleanup();
  resolution.resolve.mockReset();
  resolution.recheck.mockReset();
});

describe("DeleteTaskDialog", () => {
  it("keeps a long task ID inside the confirmation dialog", async () => {
    const taskId = "I".repeat(500);
    renderDialog(taskId);

    await userEvent.setup().click(screen.getByRole("button", { name: "할 일 삭제" }));

    expect(screen.getByText(taskId)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
  });

  it("requires byte-exact input before a delete attempt", async () => {
    renderDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "할 일 삭제" }));
    const dialog = screen.getByRole("alertdialog", { name: "할 일 삭제" });
    expect(dialog).toHaveAttribute("data-slot", "alert-dialog-content");
    expect(screen.getByText("task-1")).toHaveClass("font-mono");
    const input = screen.getByRole("textbox", { name: "할 일 ID" });
    const submit = screen.getByRole("button", { name: "삭제 확인" });

    for (const value of ["task-1 ", "TASK-1", "wrong"]) {
      fireEvent.change(input, { target: { value } });
      expect(submit).toBeDisabled();
    }
    expect(resolution.resolve).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "task-1" } });
    expect(submit).toBeEnabled();
  });

  it("locks dismiss paths during a pending attempt and resets after cancel", async () => {
    const user = userEvent.setup();
    let release: (value: { kind: "exists"; message: string }) => void = () => undefined;
    resolution.resolve.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    renderDialog();

    const trigger = screen.getByRole("button", { name: "할 일 삭제" });
    await user.click(trigger);
    const dialog = screen.getByRole("alertdialog", { name: "할 일 삭제" });
    const input = screen.getByRole("textbox", { name: "할 일 ID" });
    const submit = screen.getByRole("button", { name: "삭제 확인" });
    fireEvent.change(input, { target: { value: "task-1" } });
    await user.click(submit);
    await user.click(submit);

    expect(resolution.resolve).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("삭제 결과를 확인하고 있습니다.");
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
    expect(submit).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog", { name: "할 일 삭제" })).toBeInTheDocument();

    release({ kind: "exists", message: "할 일이 존재합니다. 삭제를 다시 시도할 수 있습니다." });
    expect(await screen.findByRole("alert")).toHaveTextContent("삭제를 다시 시도할 수 있습니다.");
    expect(input).toHaveValue("task-1");
    expect(submit).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(screen.getByRole("textbox", { name: "할 일 ID" })).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps 404 non-success and rechecks presence with GET-only action", async () => {
    const user = userEvent.setup();
    resolution.resolve.mockResolvedValueOnce({
      kind: "absent",
      message: "할 일을 찾을 수 없습니다.",
    });
    resolution.recheck.mockResolvedValueOnce({
      kind: "exists",
      message: "할 일이 존재합니다. 삭제를 다시 시도할 수 있습니다.",
    });
    const { onSuccess, onAbsent } = renderDialog();

    await user.click(screen.getByRole("button", { name: "할 일 삭제" }));
    await user.type(screen.getByRole("textbox", { name: "할 일 ID" }), "task-1");
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("할 일을 찾을 수 없습니다.");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onAbsent).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "삭제 확인" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "할 일 목록으로 이동" })).toHaveAttribute(
      "href",
      "/task",
    );

    await user.click(screen.getByRole("button", { name: "다시 확인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("삭제를 다시 시도할 수 있습니다.");
    expect(resolution.resolve).toHaveBeenCalledTimes(1);
    expect(resolution.recheck).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "삭제 확인" })).toBeEnabled();
  });

  it("calls success only for the explicit success resolution", async () => {
    const user = userEvent.setup();
    resolution.resolve.mockResolvedValueOnce({ kind: "success" });
    const { onSuccess, onAbsent } = renderDialog();

    await user.click(screen.getByRole("button", { name: "할 일 삭제" }));
    await user.type(screen.getByRole("textbox", { name: "할 일 ID" }), "task-1");
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onAbsent).not.toHaveBeenCalled();
  });

  it("restores the prior recoverable state when a later response is stale", async () => {
    const user = userEvent.setup();
    resolution.resolve
      .mockResolvedValueOnce({ kind: "exists", message: "다시 시도할 수 있습니다." })
      .mockResolvedValueOnce({ kind: "stale" });
    const { onSuccess, onAbsent } = renderDialog();

    await user.click(screen.getByRole("button", { name: "할 일 삭제" }));
    await user.type(screen.getByRole("textbox", { name: "할 일 ID" }), "task-1");
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("다시 시도할 수 있습니다.");
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("다시 시도할 수 있습니다.");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onAbsent).not.toHaveBeenCalled();
  });
});
