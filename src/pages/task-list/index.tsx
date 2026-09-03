import { CreateTaskDialog } from "@/features/create-task";
import { TaskList } from "@/widgets/task-list";

export function TaskListPage() {
  return (
    <section className="flex h-[calc(100svh-10rem)] flex-col md:h-[calc(100svh-6rem)]">
      <div className="mb-6 grid gap-4 sm:flex sm:items-start sm:justify-between">
        <div>
          <h1 className="font-semibold text-3xl tracking-tight">할 일</h1>
          <p className="mt-2 text-muted-foreground">처리할 업무를 선택하세요.</p>
        </div>
        <CreateTaskDialog />
      </div>
      <TaskList />
    </section>
  );
}
