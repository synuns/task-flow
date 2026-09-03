import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, X } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { userKeys } from "@/entities/user";
import { updateUser, useApiClient } from "@/shared/api";
import { Alert, AlertDescription, Button, Input } from "@/shared/ui";

type EditableField = "name" | "memo";

interface UpdateUserFieldProps {
  field: EditableField;
  label: string;
  value: string;
  editing: boolean;
  disabled: boolean;
  onStart: () => void;
  onFinish: () => void;
}

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "회원정보를 수정하지 못했습니다.";
}

export function UpdateUserField({
  field,
  label,
  value,
  editing,
  disabled,
  onStart,
  onFinish,
}: UpdateUserFieldProps) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const inputId = useId();
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const mutation = useMutation({
    mutationFn: (nextValue: string) =>
      field === "name"
        ? updateUser(client, { name: nextValue })
        : updateUser(client, { memo: nextValue }),
    onSuccess: (user) => {
      queryClient.setQueryData(userKeys.all, user);
      onFinish();
      queueMicrotask(() => editButtonRef.current?.focus());
    },
  });

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const normalized = field === "name" ? draft.trim() : draft;
  const invalid = field === "name" && normalized.length === 0;

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
    if (invalid || normalized === value || mutation.isPending) return;
    mutation.mutate(normalized);
  }

  return (
    <div className="grid gap-2 py-4 last:pb-0 sm:grid-cols-[8rem_1fr] sm:gap-x-4">
      <dt className="font-medium text-muted-foreground text-sm">
        {editing ? <label htmlFor={inputId}>{label}</label> : label}
      </dt>
      <dd>
        {editing ? (
          <form className="flex items-start gap-2" onSubmit={submit}>
            <Input
              ref={inputRef}
              id={inputId}
              aria-invalid={invalid || undefined}
              maxLength={field === "name" ? 50 : 500}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon-lg"
              aria-label={`${label} 수정 완료`}
              disabled={invalid || normalized === value || mutation.isPending}
            >
              <Check />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={`${label} 수정 취소`}
              disabled={mutation.isPending}
              onClick={cancel}
            >
              <X />
            </Button>
          </form>
        ) : (
          <div className="flex min-h-10 items-center justify-between gap-3">
            <span className={field === "memo" ? "whitespace-pre-wrap" : "font-medium"}>
              {value || "—"}
            </span>
            <Button
              ref={editButtonRef}
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={`${label} 수정`}
              disabled={disabled}
              onClick={start}
            >
              <Pencil />
            </Button>
          </div>
        )}
        {mutation.isError ? (
          <Alert className="mt-2" variant="destructive">
            <AlertDescription>{errorMessage(mutation.error)}</AlertDescription>
          </Alert>
        ) : null}
      </dd>
    </div>
  );
}
