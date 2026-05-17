import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';

function renderInRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('DashboardPage', () => {
  it('muestra el botón "Añadir candidato" como link a /candidates/new', () => {
    renderInRouter(<DashboardPage />);

    const link = screen.getByRole('link', { name: /añadir candidato/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/candidates/new');
  });

  it('muestra el heading principal "Dashboard"', () => {
    renderInRouter(<DashboardPage />);
    expect(
      screen.getByRole('heading', { name: /dashboard/i, level: 1 }),
    ).toBeInTheDocument();
  });
});
