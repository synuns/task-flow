import { userKeys } from "@/entities/user";
import { getUser, useApiClient } from "@/shared/api";
import { AsyncError, AsyncLoading, Card, CardContent, Skeleton } from "@/shared/ui";
import { useQuery } from "@tanstack/react-query";

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "회원정보를 불러오지 못했습니다.";
}

export function UserProfile() {
  const client = useApiClient();
  const query = useQuery({
    queryKey: userKeys.all,
    queryFn: ({ signal }) => getUser(client, signal),
  });

  if (query.isPending) {
    return (
      <AsyncLoading className="max-w-2xl" message="회원정보를 불러오고 있습니다.">
        <Skeleton className="h-40" />
      </AsyncLoading>
    );
  }
  if (query.isError) {
    return (
      <AsyncError
        className="max-w-2xl"
        message={errorMessage(query.error)}
        onRetry={() => void query.refetch()}
        title="회원정보를 불러오지 못했습니다."
      />
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardContent>
        <dl className="divide-y">
          <div className="grid gap-1 py-4 first:pt-0 sm:grid-cols-[8rem_1fr] sm:gap-4">
            <dt className="font-medium text-muted-foreground text-sm">이름</dt>
            <dd className="font-medium">{query.data.name}</dd>
          </div>
          <div className="grid gap-1 py-4 last:pb-0 sm:grid-cols-[8rem_1fr] sm:gap-4">
            <dt className="font-medium text-muted-foreground text-sm">메모</dt>
            <dd className="whitespace-pre-wrap">{query.data.memo}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
