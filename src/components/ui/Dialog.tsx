'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from './Button';
import { Title } from './Title';

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Buttons shown at the bottom (right-aligned). */
  actions?: React.ReactNode;
};

/** A modal built on the native <dialog>: focus trapping, Esc to close and an inert page behind it come for free. */
export function Dialog({ open, onClose, title, description, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-ui border border-border bg-bg p-0 text-fg backdrop:bg-black/50"
    >
      {open && (
        <div className="grid gap-4 p-5 sm:p-6">
          <Title as="h2" size="h3" id="dialog-title">
            {title}
          </Title>
          {description && <p className="m-0 font-sans text-[0.9375rem] leading-[1.55] text-muted">{description}</p>}
          {children}
          {actions && <div className="mt-2 flex flex-wrap justify-end gap-2">{actions}</div>}
        </div>
      )}
    </dialog>
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = 'Cancel', busy, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      actions={
        <>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    />
  );
}
