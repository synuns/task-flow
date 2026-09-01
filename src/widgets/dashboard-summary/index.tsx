import { dashboardKeys } from "@/entities/dashboard";
import { getDashboard, useApiClient } from "@/shared/api";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Skeleton,
} from "@/shared/ui";
import { useQuery } from "@tanstack/react-query";

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "업무 현황을 불러오지 못했습니다.";
}

export function DashboardSummary() {
  const client = useApiClient();
  const query = useQuery({
    queryKey: dashboardKeys.all,
    queryFn: () => getDashboard(client),
  });

  if (query.isPending) {
    return (
      <div className="grid gap-4" role="status">
        <span className="sr-only">업무 현황을 불러오고 있습니다.</span>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>업무 현황을 불러오지 못했습니다.</AlertTitle>
        <AlertDescription>
          <p>{errorMessage(query.error)}</p>
          <Button onClick={() => void query.refetch()} size="sm" type="button" variant="outline">
            다시 불러오기
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const { numOfDoneTask: done, numOfRestTask: rest, numOfTask: total } = query.data;
  const completion = total ? (done / total) * 100 : 0;
  const summary = total ? `${total}개 중 ${rest}개가 남았습니다` : "등록된 할 일이 없습니다";

  return (
    <Card>
      <CardHeader>
        <CardDescription>오늘의 업무 현황</CardDescription>
        <CardTitle>
          <h2 className="text-2xl tracking-tight">{summary}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium tabular-nums">
              {done} / {total} 완료
            </span>
            <span className="text-muted-foreground tabular-nums">{Math.round(completion)}%</span>
          </div>
          <Progress aria-label="업무 완료율" value={completion} />
        </div>
        <dl className="grid grid-cols-3 divide-x rounded-lg bg-accent/50 py-3 text-center">
          <div>
            <dt className="text-muted-foreground text-xs">전체 할 일</dt>
            <dd className="mt-1 font-semibold tabular-nums">{total}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">남은 할 일</dt>
            <dd className="mt-1 font-semibold tabular-nums">{rest}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">완료한 일</dt>
            <dd className="mt-1 font-semibold tabular-nums">{done}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
