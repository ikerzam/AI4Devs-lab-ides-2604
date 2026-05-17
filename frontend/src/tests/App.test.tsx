import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders dashboard with link to add candidate', () => {
  render(<App />);
  const cta = screen.getByRole('link', { name: /añadir candidato/i });
  expect(cta).toBeInTheDocument();
});
