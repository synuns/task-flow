import { type ApiError, createUser } from "@/shared/api";
import { Alert, AlertDescription, Button, Card, CardContent, Input, Label } from "@/shared/ui";
import { loginEmailSchema, loginPasswordSchema } from "@/shared/validation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { signUpSchema, type SignUpValues } from "../model/sign-up-schema";

function message(result: ReturnType<typeof loginEmailSchema.safeParse>): true | string {
  return result.success ? true : (result.error.issues[0]?.message ?? "입력값을 확인해주세요.");
}

function isApiError(value: unknown): value is ApiError {
  return (
    !!value && typeof value === "object" && typeof (value as { kind?: unknown }).kind === "string"
  );
}

function FieldError({ id, value }: { id: string; value?: string }) {
  return value ? (
    <p className="text-destructive text-sm" id={id}>
      {value}
    </p>
  ) : null;
}

export function SignUpForm() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    trigger,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignUpValues>({
    defaultValues: { email: "", password: "", passwordConfirmation: "", name: "" },
    mode: "onChange",
  });
  const [formError, setFormError] = useState<{ message: string; outcomeUnknown: boolean } | null>(
    null,
  );
  const submittingRef = useRef(false);

  const submit = handleSubmit(async (values) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setFormError(null);
    const parsed = signUpSchema.parse(values);
    try {
      await createUser({ email: parsed.email, password: parsed.password, name: parsed.name });
      navigate("/sign-in", { replace: true });
    } catch (error) {
      if (isApiError(error) && error.kind === "http" && error.status === 409) {
        setError("email", { message: error.message }, { shouldFocus: true });
      } else if (
        isApiError(error) &&
        (error.kind === "network" || error.kind === "invalid-response")
      ) {
        setFormError({
          message: "계정 생성 결과를 확인할 수 없습니다. 로그인하거나 다시 제출해 확인해주세요.",
          outcomeUnknown: true,
        });
      } else {
        setFormError({
          message: isApiError(error) ? error.message : "회원가입 요청을 처리하지 못했습니다.",
          outcomeUnknown: false,
        });
      }
    } finally {
      submittingRef.current = false;
    }
  });

  return (
    <Card>
      <CardContent>
        <form className="grid gap-5" noValidate onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="sign-up-email">이메일</Label>
            <Input
              aria-describedby={errors.email ? "sign-up-email-error" : undefined}
              aria-invalid={errors.email ? "true" : "false"}
              autoComplete="email"
              className="h-11"
              id="sign-up-email"
              type="email"
              {...register("email", {
                validate: (value) => message(loginEmailSchema.safeParse(value)),
              })}
            />
            <FieldError id="sign-up-email-error" value={errors.email?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sign-up-password">비밀번호</Label>
            <Input
              aria-describedby={
                errors.password
                  ? "sign-up-password-help sign-up-password-error"
                  : "sign-up-password-help"
              }
              aria-invalid={errors.password ? "true" : "false"}
              autoComplete="new-password"
              className="h-11"
              id="sign-up-password"
              type="password"
              {...register("password", {
                validate: (value) => message(loginPasswordSchema.safeParse(value)),
                onChange: () => void trigger("passwordConfirmation"),
              })}
            />
            <p className="text-muted-foreground text-sm" id="sign-up-password-help">
              8~24자의 영문과 숫자를 입력하세요.
            </p>
            <FieldError id="sign-up-password-error" value={errors.password?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sign-up-password-confirmation">비밀번호 확인</Label>
            <Input
              aria-describedby={
                errors.passwordConfirmation ? "sign-up-password-confirmation-error" : undefined
              }
              aria-invalid={errors.passwordConfirmation ? "true" : "false"}
              autoComplete="new-password"
              className="h-11"
              id="sign-up-password-confirmation"
              type="password"
              {...register("passwordConfirmation", {
                validate: (value) =>
                  value.length === 0
                    ? "비밀번호를 한 번 더 입력해주세요."
                    : value === getValues("password") || "비밀번호가 일치하지 않습니다.",
              })}
            />
            <FieldError
              id="sign-up-password-confirmation-error"
              value={errors.passwordConfirmation?.message}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sign-up-name">이름</Label>
            <Input
              aria-describedby={errors.name ? "sign-up-name-error" : undefined}
              aria-invalid={errors.name ? "true" : "false"}
              autoComplete="name"
              className="h-11"
              id="sign-up-name"
              {...register("name", {
                validate: (value) => {
                  const result = signUpSchema.shape.name.safeParse(value);
                  return result.success
                    ? true
                    : (result.error.issues[0]?.message ?? "이름을 확인해주세요.");
                },
              })}
            />
            <FieldError id="sign-up-name-error" value={errors.name?.message} />
          </div>
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>
                <p>{formError.message}</p>
                {formError.outcomeUnknown && (
                  <Link className="font-medium underline underline-offset-4" to="/sign-in">
                    로그인으로 결과 확인
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          )}
          <Button className="h-11 w-full" disabled={!isValid || isSubmitting} type="submit">
            {isSubmitting ? "가입 중" : "회원가입"}
          </Button>
        </form>
        <p className="mt-5 text-center text-muted-foreground text-sm">
          이미 계정이 있나요?{" "}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            to="/sign-in"
          >
            로그인
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
