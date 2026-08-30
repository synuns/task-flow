export type ApiError =
  | { kind: "http"; status: number; message: string }
  | { kind: "invalid-response"; status: number; message: string }
  | { kind: "network"; message: string }
  | { kind: "aborted"; message: string };
