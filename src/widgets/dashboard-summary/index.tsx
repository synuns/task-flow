import { dashboardKeys } from "@/entities/dashboard";
import { getDashboard, useApiClient } from "@/shared/api";
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

  if (query.isPending) return <p role="status">업무 현황을 불러오고 있습니다.</p>;
  if (query.isError) {
    return (
      <section>
        <p role="alert">{errorMessage(query.error)}</p>
        <button onClick={() => void query.refetch()} type="button">
          다시 불러오기
        </button>
      </section>
    );
  }

  return (
    <dl>
      <div>
        <dt>전체 할 일</dt>
        <dd>{query.data.numOfTask}</dd>
      </div>
      <div>
        <dt>남은 할 일</dt>
        <dd>{query.data.numOfRestTask}</dd>
      </div>
      <div>
        <dt>완료한 일</dt>
        <dd>{query.data.numOfDoneTask}</dd>
      </div>
    </dl>
  );
}
