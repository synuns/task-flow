import { taskKeys } from "@/entities/task";
import { DeleteTaskDialog, evictTaskSnapshots } from "@/features/delete-task";
import { type ApiError, getTaskDetail, useApiClient } from "@/shared/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

function asApiError(value: unknown): ApiError | null {
  return value && typeof value === "object" && "kind" in value ? (value as ApiError) : null;
}

export function TaskDetailPage() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const query = useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => getTaskDetail(client, id),
  });

  if (query.isPending) return <p role="status">할 일 상세를 불러오고 있습니다.</p>;
  if (query.isError) {
    const error = asApiError(query.error);
    if (error?.kind === "http" && error.status === 404) {
      return (
        <section>
          <p role="alert">{error.message}</p>
          <Link to="/task">할 일 목록으로 이동</Link>
        </section>
      );
    }
    return (
      <section>
        <p role="alert">{error?.message ?? "할 일 상세를 불러오지 못했습니다."}</p>
        <button onClick={() => void query.refetch()} type="button">
          다시 불러오기
        </button>
      </section>
    );
  }

  return (
    <article>
      <h1>{query.data.title}</h1>
      <p>{query.data.memo}</p>
      <time dateTime={query.data.registerDatetime}>{query.data.registerDatetime}</time>
      <DeleteTaskDialog
        onAbsent={() => evictTaskSnapshots(queryClient)}
        onSuccess={async () => {
          await evictTaskSnapshots(queryClient);
          navigate("/task", { replace: true });
        }}
        taskId={id}
      />
    </article>
  );
}
