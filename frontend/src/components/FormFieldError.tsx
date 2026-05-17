import React from 'react';

interface Props {
  id: string;
  message?: string;
}

export const FormFieldError: React.FC<Props> = ({ id, message }) => {
  if (!message) return null;
  // Intentionally no `role="alert"`: assistive tech is informed of these
  // inline errors via the input's `aria-describedby` + `aria-invalid`. Using
  // `role="alert"` here causes screen readers (NVDA) to announce every error
  // when N fields fail at once. Reserve `role="alert"` for the global banner.
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  );
};
