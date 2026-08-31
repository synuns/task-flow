import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { evictTaskSnapshots } from "./delete-cache";

describe("evictTaskSnapshots", () => {
  it("removes task list, detail, and dashboard snapshots while preserving unrelated cache", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["tasks"], { pages: [{ data: [{ id: "task-1" }] }] });
    queryClient.setQueryData(["task", "task-1"], { title: "첫 번째 할 일" });
    queryClient.setQueryData(["dashboard"], { numOfTask: 3 });
    queryClient.setQueryData(["unrelated"], { keep: true });

    await evictTaskSnapshots(queryClient);

    expect(queryClient.getQueriesData({ queryKey: ["tasks"] })).toEqual([]);
    expect(queryClient.getQueriesData({ queryKey: ["task"] })).toEqual([]);
    expect(queryClient.getQueriesData({ queryKey: ["dashboard"] })).toEqual([]);
    expect(queryClient.getQueryData(["unrelated"])).toEqual({ keep: true });
  });
});
