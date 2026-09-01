import { DashboardSummary } from "@/widgets/dashboard-summary";

export function DashboardPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="font-semibold text-3xl tracking-tight">대시보드</h1>
        <p className="mt-2 text-muted-foreground">오늘의 업무 현황을 한눈에 확인하세요.</p>
      </div>
      <DashboardSummary />
    </section>
  );
}
