import { type ApiError, type AuthTokenPair, signIn } from "@/shared/api";
import { Modal } from "@/shared/ui";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { signInSchema, type SignInValues } from "../model/sign-in-schema";

type SignInFormProps = { onAuthenticated(tokens: AuthTokenPair): void };

function validationMessage(field: "email" | "password", value: string): true | string {
  const result = signInSchema.shape[field].safeParse(value);
  return result.success ? true : (result.error.issues[0]?.message ?? "입력값을 확인해주세요.");
}

function isApiError(value: unknown): value is ApiError {
  return (
    !!value && typeof value === "object" && typeof (value as { kind?: unknown }).kind === "string"
  );
}

export function SignInForm({ onAuthenticated }: SignInFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignInValues>({
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);

  const submit = handleSubmit(async (values) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      onAuthenticated(await signIn(values));
    } catch (error) {
      setApiError(isApiError(error) ? error.message : "로그인 요청을 처리하지 못했습니다.");
    } finally {
      submittingRef.current = false;
    }
  });

  return (
    <>
      <form noValidate onSubmit={submit}>
        <div>
          <label htmlFor="sign-in-email">이메일</label>
          <input
            aria-describedby={errors.email ? "sign-in-email-error" : undefined}
            aria-invalid={errors.email ? "true" : "false"}
            id="sign-in-email"
            type="email"
            {...register("email", { validate: (value) => validationMessage("email", value) })}
          />
          {errors.email && <p id="sign-in-email-error">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="sign-in-password">비밀번호</label>
          <input
            aria-describedby={errors.password ? "sign-in-password-error" : undefined}
            aria-invalid={errors.password ? "true" : "false"}
            id="sign-in-password"
            type="password"
            {...register("password", {
              validate: (value) => validationMessage("password", value),
            })}
          />
          {errors.password && <p id="sign-in-password-error">{errors.password.message}</p>}
        </div>
        <button disabled={!isValid || isSubmitting} ref={submitRef} type="submit">
          {isSubmitting ? "로그인 중" : "로그인"}
        </button>
      </form>
      <Modal
        onClose={() => setApiError(null)}
        open={apiError !== null}
        returnFocusRef={submitRef}
        title="로그인 실패"
      >
        <p role="alert">{apiError}</p>
        <button onClick={() => setApiError(null)} type="button">
          닫기
        </button>
      </Modal>
    </>
  );
}
