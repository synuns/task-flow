import { z } from "zod";
import { testAccountIds } from "./test-accounts";
import { removeTasksByOwner } from "./tasks";

const storedUserSchema = z.strictObject({
  id: z.string(),
  email: z.string().email().max(254),
  password: z
    .string()
    .min(8)
    .max(24)
    .regex(/^[A-Za-z0-9]+$/),
  name: z.string().min(1).max(50),
  memo: z.string().max(500),
});

export type StoredUser = z.infer<typeof storedUserSchema>;
type CreateStoredUser = Pick<StoredUser, "email" | "password" | "name">;
type UpdateStoredUser = Pick<StoredUser, "name"> | Pick<StoredUser, "memo">;
type UserStoreState = { sequence: number; users: StoredUser[] };

const fixtureStorageKey = "__taskflow_msw_user_fixture__";
const seed: StoredUser[] = [
  {
    id: testAccountIds.primary,
    email: "user@example.com",
    password: "Password1",
    name: "김담당",
    memo: "오늘도 차근차근",
  },
  {
    id: testAccountIds.empty,
    email: "empty@example.com",
    password: "Password1",
    name: "빈 목록 사용자",
    memo: "등록된 할 일이 없는 계정",
  },
  {
    id: testAccountIds.error,
    email: "error@example.com",
    password: "Password1",
    name: "오류 재현 사용자",
    memo: "보호 조회 오류를 재현하는 계정",
  },
];

const canonicalEmail = (email: string) => email.trim().toLowerCase();
const initialState = (): UserStoreState => ({ sequence: 1, users: structuredClone(seed) });

function loadState(): UserStoreState {
  try {
    const raw = globalThis.sessionStorage?.getItem(fixtureStorageKey);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<UserStoreState>;
    return typeof parsed.sequence === "number" &&
      Number.isInteger(parsed.sequence) &&
      parsed.sequence >= 1 &&
      Array.isArray(parsed.users) &&
      parsed.users.every((user) => storedUserSchema.safeParse(user).success)
      ? (structuredClone(parsed) as UserStoreState)
      : initialState();
  } catch {
    return initialState();
  }
}

let state = loadState();

function persistState(): void {
  try {
    globalThis.sessionStorage?.setItem(fixtureStorageKey, JSON.stringify(state));
  } catch {
    // A storage-disabled browser can still exercise the fixture until the next reload.
  }
}

export function resetUserStore(): void {
  state = initialState();
  persistState();
}

export function createStoredUser(input: CreateStoredUser): StoredUser | null {
  const candidate = storedUserSchema.safeParse({
    ...input,
    id: `user-${state.sequence + 1}`,
    email: canonicalEmail(input.email),
    name: input.name.trim(),
    memo: "",
  });
  if (!candidate.success || state.users.some((user) => user.email === candidate.data.email)) {
    return null;
  }
  state.sequence += 1;
  state.users.push(candidate.data);
  persistState();
  return structuredClone(candidate.data);
}

export function findUser(id: string): StoredUser | null {
  const user = state.users.find((candidate) => candidate.id === id);
  return user ? structuredClone(user) : null;
}

export function authenticateUser(email: string, password: string): StoredUser | null {
  const user = state.users.find(
    (candidate) => candidate.email === canonicalEmail(email) && candidate.password === password,
  );
  return user ? structuredClone(user) : null;
}

export function updateStoredUser(id: string, update: UpdateStoredUser): StoredUser | null {
  const keys = Object.keys(update);
  const user = state.users.find((candidate) => candidate.id === id);
  if (!user || keys.length !== 1) return null;

  const next = storedUserSchema.safeParse({
    ...user,
    ...("name" in update ? { name: update.name.trim() } : { memo: update.memo }),
  });
  if (!next.success) return null;
  Object.assign(user, next.data);
  persistState();
  return structuredClone(user);
}

export function removeAccount(id: string, password: string): { removedTaskCount: number } | null {
  const index = state.users.findIndex(
    (candidate) => candidate.id === id && candidate.password === password,
  );
  if (index < 0) return null;
  const removedTaskCount = removeTasksByOwner(id);
  state.users.splice(index, 1);
  persistState();
  return { removedTaskCount };
}
