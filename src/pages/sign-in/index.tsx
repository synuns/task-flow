import { SignInForm, type SignInFormProps } from "@/features/sign-in";

export function SignInPage({ onAuthenticated }: SignInFormProps) {
  return (
    <section className="mx-auto flex min-h-[calc(100svh-12rem)] max-w-md flex-col justify-center">
      <div className="mb-6">
        <h1 className="font-semibold text-3xl tracking-tight">로그인</h1>
        <p className="mt-2 text-muted-foreground">업무 목록을 확인하려면 로그인하세요.</p>
      </div>
      <SignInForm onAuthenticated={onAuthenticated} />
    </section>
  );
}
