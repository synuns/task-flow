import { dashboardKeys } from "@/entities/dashboard";
import { taskKeys } from "@/entities/task";
import { type ApiError, createTask, useApiClient } from "@/shared/api";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@/shared/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { createTaskSchema } from "../model/create-task-schema";

type State =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "checking" }
  | { kind: "unknown-ready" }
  | { kind: "error"; message: string };

function isOutcomeUnknown(error: unknown): boolean {
  const kind = (error as Partial<ApiError> | null)?.kind;
  return kind === "network" || kind === "invalid-response";
}

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "할 일을 생성하지 못했습니다.";
}

export function CreateTaskDialog() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const submittingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [memoError, setMemoError] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const locked = state.kind === "pending" || state.kind === "checking";

  function resetAndClose() {
    if (locked) return;
    setOpen(false);
    setTitle("");
    setMemo("");
    setTitleError(null);
    setMemoError(null);
    setState({ kind: "idle" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const parsed = createTaskSchema.safeParse({ title, memo });
    setTitleError(parsed.success ? null : (parsed.error.flatten().fieldErrors.title?.[0] ?? null));
    setMemoError(parsed.success ? null : (parsed.error.flatten().fieldErrors.memo?.[0] ?? null));
    if (!parsed.success) return;

    submittingRef.current = true;
    setState({ kind: "pending" });
    try {
      await createTask(client, parsed.data);
      await Promise.all([
        queryClient.resetQueries({ exact: true, queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
      setState({ kind: "idle" });
      setOpen(false);
      setTitle("");
      setMemo("");
    } catch (error) {
      if (isOutcomeUnknown(error)) {
        setState({ kind: "checking" });
        await queryClient.refetchQueries({ queryKey: taskKeys.all, type: "active" });
        setState({ kind: "unknown-ready" });
      } else {
        setState({ kind: "error", message: errorMessage(error) });
      }
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setOpen(true);
        else resetAndClose();
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto" type="button">
          <Plus aria-hidden="true" />새 할 일
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-busy={locked || undefined}
        onEscapeKeyDown={(event) => locked && event.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>새 할 일</DialogTitle>
          <DialogDescription>제목과 필요한 메모를 입력해주세요.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}>
          <div className="grid gap-2">
            <Label htmlFor="create-task-title">제목</Label>
            <Input
              aria-describedby={titleError ? "create-task-title-error" : undefined}
              aria-invalid={titleError ? "true" : "false"}
              autoFocus
              disabled={locked}
              id="create-task-title"
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
            {titleError && (
              <p className="text-destructive text-sm" id="create-task-title-error">
                {titleError}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-task-memo">메모</Label>
            <textarea
              aria-describedby={memoError ? "create-task-memo-error" : undefined}
              aria-invalid={memoError ? "true" : "false"}
              className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={locked}
              id="create-task-memo"
              maxLength={500}
              onChange={(event) => setMemo(event.target.value)}
              value={memo}
            />
            {memoError && (
              <p className="text-destructive text-sm" id="create-task-memo-error">
                {memoError}
              </p>
            )}
          </div>
          {state.kind === "checking" && (
            <p className="text-muted-foreground text-sm" role="status">
              생성 결과를 목록에서 확인하고 있습니다.
            </p>
          )}
          {state.kind === "unknown-ready" && (
            <Alert variant="destructive">
              <AlertDescription>
                생성 결과를 확인할 수 없습니다. 목록을 확인한 뒤 다시 시도할 수 있습니다.
              </AlertDescription>
            </Alert>
          )}
          {state.kind === "error" && (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button disabled={locked} onClick={resetAndClose} type="button" variant="outline">
              취소
            </Button>
            <Button disabled={locked} type="submit">
              {state.kind === "pending"
                ? "생성 중"
                : state.kind === "checking"
                  ? "확인 중"
                  : state.kind === "unknown-ready"
                    ? "다시 생성"
                    : "생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
