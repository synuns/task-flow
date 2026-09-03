import { LogOut } from "lucide-react";
import { useState } from "react";
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
} from "@/shared/ui";

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "로그아웃 요청을 처리하지 못했습니다.";
}

export function SignOutDialog({ onSignOut }: { onSignOut(): Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await onSignOut();
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
        if (pending) return;
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button className="w-full sm:w-auto" type="button" variant="outline">
          <LogOut aria-hidden="true" />
          로그아웃
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        aria-busy={pending || undefined}
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>로그아웃하시겠어요?</AlertDialogTitle>
          <AlertDialogDescription>현재 기기의 로그인 세션이 종료됩니다.</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus disabled={pending}>
            취소
          </AlertDialogCancel>
          <Button disabled={pending} onClick={() => void confirm()}>
            {pending ? "로그아웃 중" : "로그아웃"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
