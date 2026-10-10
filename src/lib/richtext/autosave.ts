// Debounced, serialised autosave. Saves never overlap: a change made while a save is in flight
// is saved right after it, and only the newest pending change is kept.

export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export type AutosaveOptions<T> = {
  save: (payload: T) => Promise<{ ok: boolean; error?: string }>;
  onStatus: (status: AutosaveStatus, error?: string) => void;
  delayMs?: number;
  /** Replaceable so tests can drive time by hand. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

export function createAutosave<T>(options: AutosaveOptions<T>) {
  const { save, onStatus, delayMs = 1500 } = options;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let pending: { payload: T } | null = null;
  let timer: unknown = null;
  let inFlight: Promise<void> | null = null;

  async function drain() {
    while (pending) {
      const { payload } = pending;
      pending = null;
      onStatus('saving');
      try {
        const result = await save(payload);
        if (!result.ok) throw new Error(result.error ?? 'Could not save.');
      } catch (error) {
        // Keep the change (unless a newer one arrived meanwhile) so a retry sends it again.
        pending ??= { payload };
        onStatus('error', error instanceof Error ? error.message : 'Could not save.');
        return;
      }
      if (!pending) onStatus('saved');
    }
  }

  /** Runs the drain loop unless one is already running; that loop will pick up anything new. */
  function kick(): Promise<void> {
    inFlight ??= drain().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  const stopTimer = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  return {
    /** Record a change; it is saved after the delay with no further changes. */
    schedule(payload: T) {
      pending = { payload };
      onStatus('dirty');
      stopTimer();
      timer = setTimer(() => {
        timer = null;
        void kick();
      }, delayMs);
    },
    /** Save now (before leaving the page, or when asked). Resolves when nothing is left to save or in flight. */
    async flush() {
      stopTimer();
      if (pending || inFlight) await kick();
    },
    cancel() {
      stopTimer();
      pending = null;
    },
    get hasUnsaved() {
      return pending !== null;
    },
  };
}
