import { type EditableTaskField, taskKeys } from "@/entities/task";
import { DeleteTaskDialog, evictTaskSnapshots } from "@/features/delete-task";
import { TaskStatusControl, UpdateTaskField } from "@/features/update-task";
import { type ApiError, getTaskDetail, useApiClient } from "@/shared/api";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Skeleton,
} from "@/shared/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function asApiError(value: unknown): ApiError | null {
  return value && typeof value === "object" && "kind" in value ? (value as ApiError) : null;
}

export function TaskDetailPage() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [editingField, setEditingField] = useState<EditableTaskField | null>(null);
  const query = useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: ({ signal }) => getTaskDetail(client, id, signal),
  });

  if (query.isPending) {
    return (
      <div className="grid gap-4" role="status">
        <span className="sr-only">할 일 상세를 불러오고 있습니다.</span>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-56" />
      </div>
    );
  }
  if (query.isError) {
    const error = asApiError(query.error);
    if (error?.kind === "http" && error.status === 404) {
      return (
        <Alert variant="destructive">
          <AlertTitle>요청한 할 일이 없습니다.</AlertTitle>
          <AlertDescription>
            <p>{error.message}</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/task">할 일 목록으로 이동</Link>
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <Alert variant="destructive">
        <AlertTitle>할 일 상세를 불러오지 못했습니다.</AlertTitle>
        <AlertDescription>
          <p>{error?.message ?? "할 일 상세를 불러오지 못했습니다."}</p>
          <Button onClick={() => void query.refetch()} size="sm" type="button" variant="outline">
            다시 불러오기
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <article className="mx-auto max-w-3xl">
      <Button asChild className="mb-5 -ml-3" variant="ghost">
        <Link to="/task">
          <ArrowLeft aria-hidden="true" />할 일 목록
        </Link>
      </Button>
      <UpdateTaskField
        disabled={editingField !== null && editingField !== "title"}
        editing={editingField === "title"}
        field="title"
        label="제목"
        onFinish={() => setEditingField(null)}
        onStart={() => setEditingField("title")}
        taskId={id}
        value={query.data.title}
      />
      <Card>
        <CardContent className="grid gap-6">
          <TaskStatusControl status={query.data.status} taskId={id} />
          <section>
            <h2 className="mb-2 font-medium text-muted-foreground text-sm">메모</h2>
            <UpdateTaskField
              disabled={editingField !== null && editingField !== "memo"}
              editing={editingField === "memo"}
              field="memo"
              label="메모"
              onFinish={() => setEditingField(null)}
              onStart={() => setEditingField("memo")}
              taskId={id}
              value={query.data.memo}
            />
          </section>
          <dl className="border-t pt-5">
            <div className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-4">
              <dt className="font-medium text-muted-foreground text-sm">등록 일시</dt>
              <dd>
                <time dateTime={query.data.registerDatetime}>
                  {new Intl.DateTimeFormat("ko-KR", {
                    dateStyle: "long",
                    timeStyle: "short",
                    timeZone: "Asia/Seoul",
                  }).format(new Date(query.data.registerDatetime))}
                </time>
              </dd>
            </div>
          </dl>
          <div className="flex justify-end border-t pt-5">
            <DeleteTaskDialog
              onAbsent={() => evictTaskSnapshots(queryClient)}
              onSuccess={async () => {
                await evictTaskSnapshots(queryClient);
                navigate("/task", { replace: true });
              }}
              taskId={id}
            />
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
