import { dashboardKeys } from "@/entities/dashboard";
import { getDashboard, useApiClient } from "@/shared/api";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
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

  const completion = query.data.numOfTask
    ? Math.round((query.data.numOfDoneTask / query.data.numOfTask) * 100)
    : 0;

  return (
    <div className="grid gap-4">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Card className="gap-2 py-5">
          <dt className="px-6 text-muted-foreground text-sm">전체 할 일</dt>
          <dd className="px-6 font-semibold text-3xl tabular-nums">{query.data.numOfTask}</dd>
        </Card>
        <Card className="gap-2 py-5">
          <dt className="px-6 text-muted-foreground text-sm">남은 할 일</dt>
          <dd className="px-6 font-semibold text-3xl tabular-nums">{query.data.numOfRestTask}</dd>
        </Card>
        <Card className="gap-2 py-5">
          <dt className="px-6 text-muted-foreground text-sm">완료한 일</dt>
          <dd className="px-6 font-semibold text-3xl tabular-nums">{query.data.numOfDoneTask}</dd>
        </Card>
      </dl>
      <Card className="bg-accent/40">
        <CardContent className="grid gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-medium">업무 완료율</p>
              <p className="mt-1 text-muted-foreground text-sm">
                {query.data.numOfTask === 0
                  ? "아직 등록된 할 일이 없습니다."
                  : `${query.data.numOfDoneTask}개의 업무를 완료했습니다.`}
              </p>
            </div>
            <span className="font-semibold text-2xl tabular-nums">{completion}%</span>
          </div>
          <Progress aria-label="업무 완료율" value={completion} />
        </CardContent>
      </Card>
    </div>
  );
}
