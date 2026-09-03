export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type Task = {
  id: string;
  title: string;
  memo: string;
  status: TaskStatus;
  registerDatetime: string;
};

export type TaskListItem = Omit<Task, "registerDatetime">;
export type EditableTaskField = "title" | "memo";
