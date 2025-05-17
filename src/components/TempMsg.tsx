'use client';

import React, { useEffect } from 'react';

interface TempMsgProps {
  message: string;
  clearMessage: () => void;
  duration?: number;
  error?: boolean;
}

const TempMsg: React.FC<TempMsgProps> = ({
  message,
  clearMessage,
  duration = 5000,
  error = false,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      clearMessage();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, clearMessage, duration]);

  if (!message) return null;

  return (
    <p style={{ color: error ? 'red' : 'black', marginTop: '1rem' }}>
      {message}
    </p>
  );
};

export default TempMsg;
