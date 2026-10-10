export type ToastTone = 'info' | 'error';
export type ToastItem = { id: number; message: string; tone: ToastTone; durationMs: number };
export type ToastAction = { type: 'add'; toast: ToastItem } | { type: 'dismiss'; id: number };

export const MAX_TOASTS = 3;

export function toastReducer(state: ToastItem[], action: ToastAction): ToastItem[] {
  if (action.type === 'add') return [...state, action.toast].slice(-MAX_TOASTS);
  return state.some((t) => t.id === action.id) ? state.filter((t) => t.id !== action.id) : state;
}
