export type AttemptGuard = {
  begin(): number | null;
  isCurrent(id: number): boolean;
  finish(id: number): void;
};

export function createAttemptGuard(): AttemptGuard {
  let sequence = 0;
  let current: number | null = null;

  return {
    begin() {
      if (current !== null) return null;
      current = ++sequence;
      return current;
    },
    isCurrent(id) {
      return current === id;
    },
    finish(id) {
      if (current === id) current = null;
    },
  };
}
