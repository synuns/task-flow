import { SignInForm, type SignInFormProps } from "@/features/sign-in";

export function SignInPage({ onAuthenticated }: SignInFormProps) {
  return (
    <section>
      <h1>로그인</h1>
      <SignInForm onAuthenticated={onAuthenticated} />
    </section>
  );
}
