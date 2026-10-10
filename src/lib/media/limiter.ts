/** Runs async tasks at most `max` at a time, in the order they were queued. A failing task never blocks the rest. */
export function createLimiter(max: number) {
  const limit = Math.max(1, Math.floor(max));
  let running = 0;
  const waiting: Array<() => void> = [];

  const release = () => {
    running--;
    waiting.shift()?.();
  };

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (running >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
    try {
      return await task();
    } finally {
      release();
    }
  };
}
