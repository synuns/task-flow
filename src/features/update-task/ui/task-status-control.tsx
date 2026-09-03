import { dashboardKeys } from "@/entities/dashboard";
import { type TaskStatus, taskKeys } from "@/entities/task";
import { updateTask, useApiClient } from "@/shared/api";
import { Alert, AlertDescription, Button } from "@/shared/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const options: Array<{ value: TaskStatus; label: string }> = [
  { value: "TODO", label: "할 일" },
  { value: "IN_PROGRESS", label: "진행 중" },
  { value: "DONE", label: "완료" },
];

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "상태를 수정하지 못했습니다.";
}

export function TaskStatusControl({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (nextStatus: TaskStatus) => updateTask(client, taskId, { status: nextStatus }),
    onSuccess: async (task) => {
      queryClient.setQueryData(taskKeys.detail(taskId), task);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });

  return (
    <fieldset>
      <legend className="mb-2 font-medium text-muted-foreground text-sm">상태</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            aria-pressed={status === option.value}
            disabled={mutation.isPending || status === option.value}
            key={option.value}
            onClick={() => mutation.mutate(option.value)}
            type="button"
            variant={status === option.value ? "default" : "outline"}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {mutation.isError && (
        <Alert className="mt-2" variant="destructive">
          <AlertDescription>{errorMessage(mutation.error)}</AlertDescription>
        </Alert>
      )}
    </fieldset>
  );
}
