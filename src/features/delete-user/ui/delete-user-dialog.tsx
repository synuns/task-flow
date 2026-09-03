import { Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
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

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "회원 탈퇴 요청을 처리하지 못했습니다.";
}

export function DeleteUserDialog({ onDelete }: { onDelete(password: string): Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetAndClose() {
    if (pending) return;
    setOpen(false);
    setPassword("");
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || pending) return;
    setPending(true);
    setError(null);
    try {
      await onDelete(password);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setOpen(true);
        else resetAndClose();
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          <Trash2 aria-hidden="true" />
          회원 탈퇴
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        aria-busy={pending || undefined}
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>회원 탈퇴</AlertDialogTitle>
          <AlertDialogDescription>
            계정과 모든 할 일이 영구 삭제됩니다. 계속하려면 현재 비밀번호를 입력해주세요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form className="contents" onSubmit={(event) => void submit(event)}>
          <div className="grid gap-2">
            <Label htmlFor="delete-user-password">현재 비밀번호</Label>
            <Input
              autoFocus
              id="delete-user-password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {pending ? (
            <p className="text-muted-foreground text-sm" role="status">
              탈퇴 결과를 확인하고 있습니다.
            </p>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pending}>
              취소
            </AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={!password || pending}>
              탈퇴 확인
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
