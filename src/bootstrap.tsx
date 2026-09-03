import { Button } from "@/shared/ui";

export async function bootstrap(
  startWorker: () => Promise<unknown>,
  renderApplication: () => void,
  renderFailure: () => void,
): Promise<void> {
  try {
    await startWorker();
    renderApplication();
  } catch {
    renderFailure();
  }
}

export function BootstrapFailure({ onRetry }: { onRetry(): void }) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="grid max-w-md gap-4 rounded-xl border bg-card p-6" role="alert">
        <h1 className="font-semibold text-xl">애플리케이션을 시작하지 못했습니다.</h1>
        <p className="text-muted-foreground">로컬 API를 준비하지 못했습니다.</p>
        <Button onClick={onRetry} type="button">
          다시 시도
        </Button>
      </section>
    </main>
  );
}
