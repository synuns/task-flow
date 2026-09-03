import { useApiClient } from "@/shared/api";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
  Label,
} from "@/shared/ui";
import { Trash2 } from "lucide-react";
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
    <AlertDialog
      onOpenChange={(nextOpen) => {
        if (nextOpen) setOpen(true);
        else resetAndClose();
      }}
      open={open}
    >
      <AlertDialogTrigger asChild>
        <Button
          onClick={() => {
            setInput("");
            setState({ kind: "idle" });
          }}
          type="button"
          variant="destructive"
        >
          <Trash2 aria-hidden="true" />할 일 삭제
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        aria-busy={pending || undefined}
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>할 일 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            삭제하려면 아래 할 일 ID를 정확히 입력해주세요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <code className="min-w-0 rounded-md bg-muted px-3 py-2 font-mono text-sm [overflow-wrap:anywhere]">
          {taskId}
        </code>
        <form className="contents" onSubmit={(event) => void submit(event)}>
          <div className="grid gap-2">
            <Label htmlFor="delete-task-id">할 일 ID</Label>
            <Input
              autoComplete="off"
              disabled={pending}
              id="delete-task-id"
              onChange={(event) => setInput(event.target.value)}
              value={input}
            />
          </div>
          {pending && (
            <p className="text-muted-foreground text-sm" role="status">
              삭제 결과를 확인하고 있습니다.
            </p>
          )}
          {message && (
            <Alert variant={state.kind === "exists" ? "default" : "destructive"}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          {showRecovery && (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={pending}
                onClick={() => void recheck()}
                type="button"
                variant="outline"
              >
                다시 확인
              </Button>
              <Button asChild variant="outline">
                <Link to="/task">할 일 목록으로 이동</Link>
              </Button>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending} type="button">
              취소
            </AlertDialogCancel>
            <Button disabled={submitDisabled} type="submit" variant="destructive">
              삭제 확인
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
