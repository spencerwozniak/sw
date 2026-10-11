'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { X } from 'lucide-react';
import { cx } from '@/lib/cx';
import { iconButtonClasses } from './IconButton';
import { toastReducer, type ToastTone } from './toast-reducer';

type ToastOptions = { tone?: ToastTone; durationMs?: number };
type ToastFn = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ToastFn | null>(null);

/** `const toast = useToast(); toast('Saved'); toast('Upload failed', { tone: 'error' });` */
export function useToast(): ToastFn {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast must be used inside <ToastProvider>.');
  return toast;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    dispatch({ type: 'dismiss', id });
  }, []);

  const toast = useCallback<ToastFn>(
    (message, options = {}) => {
      const tone = options.tone ?? 'info';
      const id = nextId.current++;
      const durationMs = options.durationMs ?? (tone === 'error' ? 8000 : 5000);
      dispatch({ type: 'add', toast: { id, message, tone, durationMs } });
      timers.current.set(id, setTimeout(() => dismiss(id), durationMs));
    },
    [dismiss]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div role="region" aria-label="Notifications" className="pointer-events-none fixed inset-x-0 bottom-4 z-[2000] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cx(
              'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-ui border bg-bg px-4 py-3 font-sans text-[0.9375rem] text-fg shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
              t.tone === 'error' ? 'border-fg' : 'border-border-strong'
            )}
          >
            <span className="min-w-0 flex-1 leading-[1.45]">{t.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className={cx(iconButtonClasses('plain', 'sm'), '-mr-2 -mt-1')}>
              <X aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
