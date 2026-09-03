import { Card, CardContent } from "@/shared/ui";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { TaskStatus } from "../model/task";

export type TaskCardProps = { id: string; title: string; memo: string; status: TaskStatus };

const statusLabel: Record<TaskStatus, string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
};

export function TaskCard({ id, title, memo, status }: TaskCardProps) {
  return (
    <article className="h-full p-1">
      <Link
        aria-label={`${title} ${memo} 상태 ${statusLabel[status]}`}
        className="block h-full rounded-xl"
        to={`/task/${encodeURIComponent(id)}`}
      >
        <Card className="h-full gap-2 py-3 transition-colors hover:border-ring hover:bg-accent/40">
          <CardContent className="grid h-full grid-cols-[1fr_auto] items-center gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words font-semibold">{title}</h2>
                <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-xs">
                  {statusLabel[status]}
                </span>
              </div>
              <p className="mt-1 break-words text-muted-foreground text-sm">{memo}</p>
            </div>
            <ArrowRight aria-hidden="true" className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </article>
  );
}
