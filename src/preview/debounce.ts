// Trailing-edge debouncer. Host-side; used by the Preview panel to coalesce
// rapid document changes into a single re-render.
export interface Debouncer {
  schedule(fn: () => void): void;
  cancel(): void;
}

export function createDebouncer(delayMs: number): Debouncer {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    schedule(fn) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, delayMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = undefined;
    },
  };
}
