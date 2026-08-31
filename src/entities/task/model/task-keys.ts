export const taskKeys = {
  all: ["tasks"] as const,
  detailRoot: ["task"] as const,
  detail: (id: string) => ["task", id] as const,
};
