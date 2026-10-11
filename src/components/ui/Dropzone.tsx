'use client';

import React, { useId, useRef, useState } from 'react';
import { cx } from '@/lib/cx';

export type DropzoneProps = {
  /** Called with the chosen or dropped files. */
  onFiles: (files: File[]) => void;
  /** Passed to the file input, e.g. "image/*,video/*". */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Accessible name for the file input. */
  label: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Drag files onto it, or press/tap it to open the file picker (the camera roll on a phone).
 * Built on a real <label> and <input type="file">, so the keyboard and screen readers work.
 */
export function Dropzone({ onFiles, accept, multiple = true, disabled, label, className, children }: DropzoneProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled && e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cx(
        'grid cursor-pointer place-items-center rounded-ui border border-dashed px-6 py-10 text-center font-sans transition-colors duration-150 ease-ui has-[:focus-visible]:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
        dragging ? 'border-accent bg-accent-wash' : 'border-border-strong hover:border-accent hover:bg-accent-wash',
        disabled && 'pointer-events-none opacity-45',
        className
      )}
    >
      <input
        ref={input}
        id={id}
        type="file"
        aria-label={label}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = ''; // so choosing the same file again still fires
        }}
      />
      {children}
    </label>
  );
}
