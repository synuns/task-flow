import type * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";

type AsyncLoadingProps = React.ComponentProps<"div"> & {
  message: string;
};

function AsyncLoading({ children, className, message, ...props }: AsyncLoadingProps) {
  return (
    <div className={className} {...props} role="status">
      <span className="sr-only">{message}</span>
      {children}
    </div>
  );
}

type AsyncErrorProps = {
  className?: string;
  message: string;
  onRetry: () => void;
  title: string;
};

function AsyncError({ className, message, onRetry, title }: AsyncErrorProps) {
  return (
    <Alert className={className} variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        <Button onClick={onRetry} size="sm" type="button" variant="outline">
          다시 불러오기
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export { AsyncError, AsyncLoading };
