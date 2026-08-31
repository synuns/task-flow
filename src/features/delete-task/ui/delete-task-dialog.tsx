import { useApiClient } from "@/shared/api";
import { Modal } from "@/shared/ui";
import { type FormEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createAttemptGuard } from "../model/attempt-guard";
import {
  type DeleteResolution,
  type PresenceResolution,
  recheckTaskPresence,
  resolveDeleteAttempt,
} from "../model/delete-task";

type DialogState = { kind: "idle" } | { kind: "pending" } | DeleteResolution;

export type DeleteTaskDialogProps = {
  taskId: string;
  onSuccess(): Promise<void>;
  onAbsent(): Promise<void>;
};

export function DeleteTaskDialog({ taskId, onSuccess, onAbsent }: DeleteTaskDialogProps) {
  const client = useApiClient();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const guardRef = useRef(createAttemptGuard());
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [state, setState] = useState<DialogState>({ kind: "idle" });
  const pending = state.kind === "pending";

  const resetAndClose = () => {
    if (pending) return;
    setOpen(false);
    setInput("");
    setState({ kind: "idle" });
  };

  const applyResolution = async (
    attemptId: number,
    previousState: DialogState,
    resolution: DeleteResolution | PresenceResolution,
  ) => {
    const guard = guardRef.current;
    if (!guard.isCurrent(attemptId)) return;
    guard.finish(attemptId);
    if (resolution.kind === "stale") {
      setState(previousState);
      return;
    }
    setState(resolution);
    if (resolution.kind === "success") await onSuccess();
    if (resolution.kind === "absent") await onAbsent();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (input !== taskId || state.kind === "absent") return;
    const attemptId = guardRef.current.begin();
    if (attemptId === null) return;
    const previousState = state;
    setState({ kind: "pending" });
    try {
      const result = await resolveDeleteAttempt(client, taskId);
      await applyResolution(attemptId, previousState, result);
    } catch {
      await applyResolution(attemptId, previousState, {
        kind: "failure",
        message: "삭제 요청을 처리하지 못했습니다.",
      });
    }
  };

  const recheck = async () => {
    const attemptId = guardRef.current.begin();
    if (attemptId === null) return;
    const previousState = state;
    setState({ kind: "pending" });
    try {
      const result = await recheckTaskPresence(client, taskId);
      await applyResolution(attemptId, previousState, result);
    } catch {
      await applyResolution(attemptId, previousState, {
        kind: "failure",
        message: "현재 상태를 확인하지 못했습니다.",
      });
    }
  };

  const message = "message" in state ? state.message : null;
  const showRecovery = state.kind === "absent" || state.kind === "unknown";
  const submitDisabled =
    input !== taskId || pending || state.kind === "absent" || state.kind === "success";

  return (
    <>
      <button
        onClick={() => {
          setInput("");
          setState({ kind: "idle" });
          setOpen(true);
        }}
        ref={triggerRef}
        type="button"
      >
        할 일 삭제
      </button>
      <Modal
        busy={pending}
        closeDisabled={pending}
        onClose={resetAndClose}
        open={open}
        returnFocusRef={triggerRef}
        title="할 일 삭제"
      >
        <form onSubmit={(event) => void submit(event)}>
          <p>삭제하려면 할 일 ID를 정확히 입력해주세요: {taskId}</p>
          <label htmlFor="delete-task-id">할 일 ID</label>
          <input
            autoComplete="off"
            disabled={pending}
            id="delete-task-id"
            onChange={(event) => setInput(event.target.value)}
            value={input}
          />
          {pending && <p role="status">삭제 결과를 확인하고 있습니다.</p>}
          {message && <p role="alert">{message}</p>}
          {showRecovery && (
            <div>
              <button disabled={pending} onClick={() => void recheck()} type="button">
                다시 확인
              </button>
              <Link to="/task">할 일 목록으로 이동</Link>
            </div>
          )}
          <button disabled={pending} onClick={resetAndClose} type="button">
            취소
          </button>
          <button disabled={submitDisabled} type="submit">
            삭제 확인
          </button>
        </form>
      </Modal>
    </>
  );
}
