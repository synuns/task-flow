import { TaskCard, taskKeys } from "@/entities/task";
import { getTasks, useApiClient } from "@/shared/api";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Skeleton,
} from "@/shared/ui";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Inbox } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "할 일을 불러오지 못했습니다.";
}

export function TaskList() {
  const client = useApiClient();
  const scrollRef = useRef<HTMLElement>(null);
  const query = useInfiniteQuery({
    queryKey: taskKeys.all,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getTasks(client, pageParam),
    getNextPageParam: (lastPage, pages) => (lastPage.hasNext ? pages.length + 1 : undefined),
  });
  const tasks = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 96,
    getItemKey: (index) => tasks[index]?.id ?? index,
    overscan: 0,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const lastVirtualIndex = virtualItems.at(-1)?.index;

  useEffect(() => {
    if (lastVirtualIndex === tasks.length - 1 && query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [
    lastVirtualIndex,
    tasks.length,
    query.hasNextPage,
    query.isFetchingNextPage,
    query.fetchNextPage,
  ]);

  if (query.isPending) {
    return (
      <div className="grid gap-2" role="status">
        <span className="sr-only">할 일을 불러오고 있습니다.</span>
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (query.isError && !query.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>할 일을 불러오지 못했습니다.</AlertTitle>
        <AlertDescription>
          <p>{errorMessage(query.error)}</p>
          <Button onClick={() => void query.refetch()} size="sm" type="button" variant="outline">
            다시 불러오기
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-8 text-center">
          <Inbox aria-hidden="true" className="mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">등록된 할 일이 없습니다.</p>
          <p className="mt-1 text-muted-foreground text-sm">
            새 업무가 등록되면 이곳에 표시됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <section
        aria-label="할 일 목록"
        className="min-h-0 flex-1 overflow-auto rounded-xl"
        ref={scrollRef}
      >
        <ul
          className="relative m-0 list-none p-0"
          style={{
            height: virtualizer.getTotalSize(),
          }}
        >
          {virtualItems.map((virtualItem) => {
            const task = tasks[virtualItem.index];
            if (!task) return null;
            return (
              <li
                data-index={virtualItem.index}
                data-task-row={task.id}
                key={task.id}
                ref={virtualizer.measureElement}
                style={{
                  left: 0,
                  minHeight: virtualItem.size,
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualItem.start}px)`,
                  width: "100%",
                }}
              >
                <TaskCard id={task.id} memo={task.memo} title={task.title} />
              </li>
            );
          })}
        </ul>
      </section>
      {query.isError && query.data && (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{errorMessage(query.error)}</p>
            <Button
              onClick={() => void query.fetchNextPage()}
              size="sm"
              type="button"
              variant="outline"
            >
              다시 불러오기
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {query.isFetchingNextPage && (
        <div className="grid gap-2" role="status">
          <span className="sr-only">다음 할 일을 불러오고 있습니다.</span>
          <Skeleton className="h-24" />
        </div>
      )}
      {query.hasNextPage && !query.isError && (
        <Button
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
          type="button"
          variant="secondary"
        >
          {query.isFetchingNextPage ? "다음 페이지 불러오는 중" : "다음 페이지 불러오기"}
        </Button>
      )}
      {!query.hasNextPage && (
        <p className="text-center text-muted-foreground text-sm">모든 할 일을 불러왔습니다.</p>
      )}
    </div>
  );
}
