import { DeleteUserDialog } from "@/features/delete-user";
import { SignOutDialog } from "@/features/sign-out";
import { UserProfile } from "@/widgets/user-profile";

export function UserPage({
  onDelete,
  onSignOut,
}: {
  onDelete(password: string): Promise<void>;
  onSignOut(): Promise<void>;
}) {
  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-semibold text-3xl tracking-tight">회원정보</h1>
          <p className="mt-2 text-muted-foreground">내 계정 정보를 확인하세요.</p>
        </div>
        <SignOutDialog onSignOut={onSignOut} />
      </div>
      <UserProfile />
      <div className="mt-8 max-w-2xl border-destructive/30 border-t pt-6">
        <h2 className="font-semibold text-destructive">계정 삭제</h2>
        <p className="mt-1 mb-4 text-muted-foreground text-sm">
          탈퇴하면 계정과 모든 할 일을 복구할 수 없습니다.
        </p>
        <DeleteUserDialog onDelete={onDelete} />
      </div>
    </section>
  );
}
