import { Card, CardContent } from "@/shared/ui";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export type TaskCardProps = { id: string; title: string; memo: string };

export function TaskCard({ id, title, memo }: TaskCardProps) {
  return (
    <article className="h-full p-1">
      <Link className="block h-full rounded-xl" to={`/task/${encodeURIComponent(id)}`}>
        <Card className="h-full gap-2 py-3 transition-colors hover:border-ring hover:bg-accent/40">
          <CardContent className="grid h-full grid-cols-[1fr_auto] items-center gap-4">
            <div className="min-w-0">
              <h2 className="break-words font-semibold">{title}</h2>
              <p className="mt-1 break-words text-muted-foreground text-sm">{memo}</p>
            </div>
            <ArrowRight aria-hidden="true" className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </article>
  );
}
