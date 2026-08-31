import { TaskCard, taskKeys } from "@/entities/task";
import { getTasks, useApiClient } from "@/shared/api";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
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

  if (query.isPending) return <p role="status">할 일을 불러오고 있습니다.</p>;
  if (query.isError && !query.data) {
    return (
      <section>
        <p role="alert">{errorMessage(query.error)}</p>
        <button onClick={() => void query.refetch()} type="button">
          다시 불러오기
        </button>
      </section>
    );
  }
  if (tasks.length === 0) return <p>등록된 할 일이 없습니다.</p>;

  return (
    <section>
      <section aria-label="할 일 목록" ref={scrollRef} style={{ height: 96, overflow: "auto" }}>
        <ul
          style={{
            height: virtualizer.getTotalSize(),
            listStyle: "none",
            margin: 0,
            padding: 0,
            position: "relative",
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
      {query.isError && query.data && <p role="alert">{errorMessage(query.error)}</p>}
      {query.hasNextPage && (
        <button
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
          type="button"
        >
          {query.isFetchingNextPage ? "다음 페이지 불러오는 중" : "다음 페이지 불러오기"}
        </button>
      )}
      {!query.hasNextPage && <p>모든 할 일을 불러왔습니다.</p>}
    </section>
  );
}
