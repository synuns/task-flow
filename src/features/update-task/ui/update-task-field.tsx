import { type EditableTaskField, taskKeys } from "@/entities/task";
import { updateTask, useApiClient } from "@/shared/api";
import { Alert, AlertDescription, Button, Input } from "@/shared/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, X } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

type Props = {
  taskId: string;
  field: EditableTaskField;
  label: string;
  value: string;
  editing: boolean;
  disabled: boolean;
  onStart(): void;
  onFinish(): void;
  onPendingChange(pending: boolean): void;
};

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "할 일을 수정하지 못했습니다.";
}

export function UpdateTaskField({
  taskId,
  field,
  label,
  value,
  editing,
  disabled,
  onStart,
  onFinish,
  onPendingChange,
}: Props) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const inputId = useId();
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const mutation = useMutation({
    mutationFn: (nextValue: string) =>
      updateTask(client, taskId, field === "title" ? { title: nextValue } : { memo: nextValue }),
    onMutate: () => onPendingChange(true),
    onSuccess: async (task) => {
      queryClient.setQueryData(taskKeys.detail(taskId), task);
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
      onFinish();
      queueMicrotask(() => editButtonRef.current?.focus());
    },
    onSettled: () => onPendingChange(false),
  });

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const normalized = field === "title" ? draft.trim() : draft;
  const invalid =
    (field === "title" && (normalized.length === 0 || normalized.length > 100)) ||
    (field === "memo" && normalized.length > 500);

  function start() {
    setDraft(value);
    mutation.reset();
    onStart();
  }

  function cancel() {
    setDraft(value);
    mutation.reset();
    onFinish();
    queueMicrotask(() => editButtonRef.current?.focus());
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || invalid || normalized === value || mutation.isPending) return;
    mutation.mutate(normalized);
  }

  return (
    <div className={field === "title" ? "mb-6" : ""}>
      {editing ? (
        <form className="flex items-start gap-2" onSubmit={submit}>
          <label className="sr-only" htmlFor={inputId}>
            {label}
          </label>
          <Input
            aria-invalid={invalid || undefined}
            className={field === "title" ? "h-11 text-lg" : undefined}
            id={inputId}
            maxLength={field === "title" ? 100 : 500}
            onChange={(event) => setDraft(event.target.value)}
            ref={inputRef}
            value={draft}
          />
          <Button
            aria-label={`${label} 수정 완료`}
            disabled={disabled || invalid || normalized === value || mutation.isPending}
            size="icon-lg"
            type="submit"
            variant="ghost"
          >
            <Check />
          </Button>
          <Button
            aria-label={`${label} 수정 취소`}
            disabled={mutation.isPending}
            onClick={cancel}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </form>
      ) : (
        <div className="flex min-w-0 items-start justify-between gap-3">
          {field === "title" ? (
            <h1 className="min-w-0 font-semibold text-3xl tracking-tight [overflow-wrap:anywhere]">
              {value}
            </h1>
          ) : (
            <p className="min-w-0 whitespace-pre-wrap leading-7 [overflow-wrap:anywhere]">
              {value || "—"}
            </p>
          )}
          <Button
            aria-label={`${label} 수정`}
            disabled={disabled}
            onClick={start}
            ref={editButtonRef}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <Pencil />
          </Button>
        </div>
      )}
      {mutation.isError && (
        <Alert className="mt-2" variant="destructive">
          <AlertDescription>{errorMessage(mutation.error)}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
