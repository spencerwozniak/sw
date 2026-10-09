import React from 'react';
import { cx } from '@/lib/cx';

export function ChatBubble({ from, children }: { from: 'user' | 'bot'; children: React.ReactNode }) {
  return (
    <div
      className={cx(
        'max-w-[80%] rounded-ui px-3 py-2 font-sans text-[0.9375rem] leading-[1.5]',
        from === 'user' ? 'self-end bg-fg text-bg' : 'self-start border border-border bg-bg text-fg'
      )}
    >
      {children}
    </div>
  );
}
