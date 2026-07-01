import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDebouncer } from "../../src/preview/debounce";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createDebouncer", () => {
  it("runs only the last scheduled fn after the delay", () => {
    const d = createDebouncer(250);
    const fn = vi.fn();
    d.schedule(fn); d.schedule(fn); d.schedule(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("cancel prevents a pending run", () => {
    const d = createDebouncer(250);
    const fn = vi.fn();
    d.schedule(fn);
    d.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });
});
