import React, { useEffect } from 'react';

interface Props {
  message: string;
  severity?: 'success' | 'error';
  onDismiss?: () => void;
  autoHideMs?: number;
}

export const Toast: React.FC<Props> = ({
  message,
  severity = 'success',
  onDismiss,
  autoHideMs = 4000,
}) => {
  useEffect(() => {
    if (!onDismiss) return;
    const timer = window.setTimeout(onDismiss, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [onDismiss, autoHideMs, message]);

  return (
    <div
      className={`toast toast-${severity}`}
      role={severity === 'error' ? 'alert' : 'status'}
      aria-live={severity === 'error' ? 'assertive' : 'polite'}
    >
      {message}
    </div>
  );
};
