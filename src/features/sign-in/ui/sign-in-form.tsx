import { type ApiError, type AuthTokenPair, signIn } from "@/shared/api";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/shared/ui";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { signInSchema, type SignInValues } from "../model/sign-in-schema";

export type SignInFormProps = { onAuthenticated(tokens: AuthTokenPair): void };

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
      <Card>
        <CardContent>
          <form className="grid gap-5" noValidate onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="sign-in-email">이메일</Label>
              <Input
                aria-describedby={errors.email ? "sign-in-email-error" : undefined}
                aria-invalid={errors.email ? "true" : "false"}
                autoComplete="email"
                className="h-11"
                id="sign-in-email"
                type="email"
                {...register("email", {
                  validate: (value) => validationMessage("email", value),
                })}
              />
              {errors.email && (
                <p className="text-destructive text-sm" id="sign-in-email-error">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sign-in-password">비밀번호</Label>
              <Input
                aria-describedby={
                  errors.password
                    ? "sign-in-password-help sign-in-password-error"
                    : "sign-in-password-help"
                }
                aria-invalid={errors.password ? "true" : "false"}
                autoComplete="current-password"
                className="h-11"
                id="sign-in-password"
                type="password"
                {...register("password", {
                  validate: (value) => validationMessage("password", value),
                })}
              />
              <p className="text-muted-foreground text-sm" id="sign-in-password-help">
                8~24자의 영문과 숫자를 입력하세요.
              </p>
              {errors.password && (
                <p className="text-destructive text-sm" id="sign-in-password-error">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button
              className="h-11 w-full"
              disabled={!isValid || isSubmitting}
              ref={submitRef}
              type="submit"
            >
              {isSubmitting ? "로그인 중" : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Dialog open={apiError !== null} onOpenChange={(open) => !open && setApiError(null)}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            submitRef.current?.focus();
          }}
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>로그인 실패</DialogTitle>
            <DialogDescription role="alert">{apiError}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">닫기</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
