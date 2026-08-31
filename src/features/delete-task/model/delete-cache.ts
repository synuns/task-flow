import { dashboardKeys } from "@/entities/dashboard";
import { taskKeys } from "@/entities/task";
import type { QueryClient } from "@tanstack/react-query";

export async function evictTaskSnapshots(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: taskKeys.all }),
    queryClient.cancelQueries({ queryKey: taskKeys.detailRoot }),
    queryClient.cancelQueries({ queryKey: dashboardKeys.all }),
  ]);
  queryClient.removeQueries({ queryKey: taskKeys.all });
  queryClient.removeQueries({ queryKey: taskKeys.detailRoot });
  queryClient.removeQueries({ queryKey: dashboardKeys.all });
}
