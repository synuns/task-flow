import { getUser, useApiClient } from "@/shared/api";
import { useQuery } from "@tanstack/react-query";
import { userKeys } from "./model/user-keys";

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "회원정보를 불러오지 못했습니다.";
}

export function UserProfile() {
  const client = useApiClient();
  const query = useQuery({ queryKey: userKeys.all, queryFn: () => getUser(client) });

  if (query.isPending) return <p role="status">회원정보를 불러오고 있습니다.</p>;
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
        <dt>이름</dt>
        <dd>{query.data.name}</dd>
      </div>
      <div>
        <dt>메모</dt>
        <dd>{query.data.memo}</dd>
      </div>
    </dl>
  );
}
