import { TaskList } from "@/widgets/task-list";

export function TaskListPage() {
  return (
    <section className="flex h-[calc(100svh-10rem)] flex-col md:h-[calc(100svh-6rem)]">
      <div className="mb-6">
        <h1 className="font-semibold text-3xl tracking-tight">할 일</h1>
        <p className="mt-2 text-muted-foreground">처리할 업무를 선택하세요.</p>
      </div>
      <TaskList />
    </section>
  );
}
