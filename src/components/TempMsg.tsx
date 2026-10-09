'use client';

import React, { useEffect } from 'react';
import { cx } from '@/lib/cx';

interface TempMsgProps {
  message: string;
  clearMessage: () => void;
  duration?: number;
  error?: boolean;
  className?: string;
}

const TempMsg: React.FC<TempMsgProps> = ({ message, clearMessage, duration = 5000, error = false, className }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      clearMessage();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, clearMessage, duration]);

  if (!message) return null;

  return (
    <p role="status" className={cx('m-0 font-sans text-sm', error ? 'font-bold text-fg' : 'text-muted', className)}>
      {message}
    </p>
  );
};

export default TempMsg;
