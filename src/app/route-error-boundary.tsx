import { useRouteError } from "react-router-dom";

export function RouteErrorBoundary() {
  useRouteError();

  return (
    <main role="alert">
      <h1>화면을 불러오지 못했습니다</h1>
      <p>페이지를 다시 열어주세요.</p>
    </main>
  );
}
