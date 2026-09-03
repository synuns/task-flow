import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { userKeys } from "@/entities/user";
import { UpdateUserField } from "@/features/update-user";
import { getUser, useApiClient } from "@/shared/api";
import { AsyncError, AsyncLoading, Card, CardContent, Skeleton } from "@/shared/ui";

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "회원정보를 불러오지 못했습니다.";
}

export function UserProfile() {
  const client = useApiClient();
  const [editingField, setEditingField] = useState<"name" | "memo" | null>(null);
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
            <dt className="font-medium text-muted-foreground text-sm">이메일</dt>
            <dd>{query.data.email}</dd>
          </div>
          <UpdateUserField
            field="name"
            label="이름"
            value={query.data.name}
            editing={editingField === "name"}
            disabled={editingField !== null && editingField !== "name"}
            onStart={() => setEditingField("name")}
            onFinish={() => setEditingField(null)}
          />
          <UpdateUserField
            field="memo"
            label="메모"
            value={query.data.memo}
            editing={editingField === "memo"}
            disabled={editingField !== null && editingField !== "memo"}
            onStart={() => setEditingField("memo")}
            onFinish={() => setEditingField(null)}
          />
        </dl>
      </CardContent>
    </Card>
  );
}
