import { SignUpForm } from "@/features/sign-up";

export function SignUpPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100svh-12rem)] max-w-md flex-col justify-center">
      <div className="mb-6">
        <h1 className="font-semibold text-3xl tracking-tight">회원가입</h1>
        <p className="mt-2 text-muted-foreground">업무를 시작할 계정을 만드세요.</p>
      </div>
      <SignUpForm />
    </section>
  );
}
