import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CandidateDetailPage } from '../pages/CandidateDetailPage';
import * as api from '../services/candidate.api';
import type { CandidateDetail } from '../types/candidate';

jest.mock('../services/candidate.api');

const mockedGetCandidate = api.getCandidate as jest.MockedFunction<
  typeof api.getCandidate
>;

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/candidates/${id}`]}>
      <Routes>
        <Route path="/candidates/:id" element={<CandidateDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const baseCandidate: CandidateDetail = {
  id: 42,
  firstName: 'Ana',
  lastName: 'García',
  email: 'ana@example.com',
  phone: '+34600111222',
  address: {
    street: 'Calle Mayor 1',
    city: 'Madrid',
    postalCode: '28001',
    country: 'ES',
  },
  educations: [
    {
      id: 1,
      institution: 'UPM',
      degree: 'Grado',
      fieldOfStudy: 'SW',
      startDate: '2018-09-01',
      endDate: '2022-06-30',
    },
  ],
  experiences: [
    {
      id: 1,
      company: 'Acme',
      position: 'Dev',
      description: null,
      startDate: '2022-07-01',
      endDate: null,
    },
  ],
  cv: null,
  createdAt: '2026-05-17T10:00:00.000Z',
  updatedAt: '2026-05-17T10:00:00.000Z',
};

describe('CandidateDetailPage', () => {
  beforeEach(() => {
    mockedGetCandidate.mockReset();
  });

  it('muestra los datos del candidato cuando el API responde', async () => {
    mockedGetCandidate.mockResolvedValueOnce(baseCandidate);

    renderAt('42');

    expect(screen.getByText(/cargando candidato/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /ana garcía/i, level: 1 }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText(/UPM/)).toBeInTheDocument();
    expect(screen.getByText(/Acme/)).toBeInTheDocument();
  });

  it('renderiza un enlace al CV cuando el candidato tiene CV', async () => {
    mockedGetCandidate.mockResolvedValueOnce({
      ...baseCandidate,
      cv: {
        url: 'http://localhost:3010/api/candidates/42/cv',
        originalName: 'mi-cv.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      },
    });

    renderAt('42');

    const cvLink = await screen.findByRole('link', { name: /descargar mi-cv\.pdf/i });
    expect(cvLink).toHaveAttribute(
      'href',
      'http://localhost:3010/api/candidates/42/cv',
    );
  });

  it('muestra "Sin CV adjunto" cuando el candidato no tiene CV', async () => {
    mockedGetCandidate.mockResolvedValueOnce(baseCandidate);

    renderAt('42');

    await screen.findByRole('heading', { name: /ana garcía/i, level: 1 });
    expect(screen.getByText(/sin cv adjunto/i)).toBeInTheDocument();
  });

  it('muestra "Candidato no encontrado" cuando el API devuelve 404', async () => {
    mockedGetCandidate.mockRejectedValueOnce({ response: { status: 404 } });

    renderAt('999');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /candidato no encontrado/i }),
      ).toBeInTheDocument();
    });
  });

  it('muestra un banner de error cuando el API falla con 500', async () => {
    mockedGetCandidate.mockRejectedValueOnce({ response: { status: 500 } });

    renderAt('42');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/no se pudo cargar el candidato/i);
  });
});
