import { UserProfile } from "@/widgets/user-profile";

export function UserPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="font-semibold text-3xl tracking-tight">회원정보</h1>
        <p className="mt-2 text-muted-foreground">내 계정 정보를 확인하세요.</p>
      </div>
      <UserProfile />
    </section>
  );
}
