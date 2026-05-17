import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CandidateFormPage } from '../pages/CandidateFormPage';
import * as api from '../services/candidate.api';

jest.mock('../services/candidate.api');

const mockedCreate = api.createCandidate as jest.MockedFunction<
  typeof api.createCandidate
>;

// `isApiErrorResponse` is used internally by the form. The auto-mock replaces it
// with `undefined`, so we restore a real implementation.
(api as { isApiErrorResponse: unknown }).isApiErrorResponse = (value: unknown) =>
  typeof value === 'object' &&
  value !== null &&
  'error' in (value as Record<string, unknown>) &&
  typeof (value as { error: unknown }).error === 'string';

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/candidates/new']}>
      <Routes>
        <Route path="/candidates/new" element={<CandidateFormPage />} />
        <Route
          path="/candidates/:id"
          element={<div data-testid="detail-page" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillMinimalRequiredFields() {
  await userEvent.type(screen.getByLabelText(/^nombre/i), 'Ana');
  await userEvent.type(screen.getByLabelText(/^apellidos/i), 'García');
  await userEvent.type(screen.getByLabelText(/^email/i), 'ana@example.com');
}

describe('CandidateFormPage', () => {
  beforeEach(() => {
    mockedCreate.mockReset();
  });

  describe('render inicial', () => {
    it('renderiza el heading "Añadir candidato" y los campos obligatorios con labels asociados', () => {
      renderForm();
      expect(
        screen.getByRole('heading', { name: /añadir candidato/i, level: 1 }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^nombre/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^apellidos/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cv \(pdf o docx/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^guardar$/i })).toBeInTheDocument();
    });
  });

  describe('submit con datos válidos', () => {
    it('llama a createCandidate y navega al detalle del candidato', async () => {
      jest.useFakeTimers();
      mockedCreate.mockResolvedValueOnce({
        id: 7,
        firstName: 'Ana',
        lastName: 'García',
        email: 'ana@example.com',
        cvUrl: null,
        createdAt: '2026-05-17T10:00:00Z',
      });

      renderForm();
      await fillMinimalRequiredFields();
      userEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

      await waitFor(() => {
        expect(mockedCreate).toHaveBeenCalledTimes(1);
      });
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Ana',
          lastName: 'García',
          email: 'ana@example.com',
        }),
        null,
      );

      // Toast de éxito (role=status)
      expect(
        screen.getByText(/candidato añadido correctamente/i),
      ).toBeInTheDocument();

      // Avanza el setTimeout(400) antes de navegar
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(screen.getByTestId('detail-page')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('validación cliente', () => {
    it('si el email está vacío muestra error inline y NO llama al API', async () => {
      renderForm();

      await userEvent.type(screen.getByLabelText(/^nombre/i), 'Ana');
      await userEvent.type(screen.getByLabelText(/^apellidos/i), 'García');
      userEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

      expect(
        await screen.findByText(/el email es obligatorio/i),
      ).toBeInTheDocument();
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('si el email tiene formato inválido muestra error y NO llama al API', async () => {
      renderForm();

      await userEvent.type(screen.getByLabelText(/^nombre/i), 'Ana');
      await userEvent.type(screen.getByLabelText(/^apellidos/i), 'García');
      await userEvent.type(screen.getByLabelText(/^email/i), 'no-es-email');
      userEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

      expect(
        await screen.findByText(/introduce un email válido/i),
      ).toBeInTheDocument();
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('si falta nombre muestra el error inline correspondiente', async () => {
      renderForm();

      await userEvent.type(screen.getByLabelText(/^apellidos/i), 'García');
      await userEvent.type(screen.getByLabelText(/^email/i), 'ana@example.com');
      userEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

      expect(
        await screen.findByText(/el nombre es obligatorio/i),
      ).toBeInTheDocument();
      expect(mockedCreate).not.toHaveBeenCalled();
    });
  });

  describe('validación de CV', () => {
    it('rechaza un fichero PNG y muestra error inline; el botón Guardar queda deshabilitado', async () => {
      renderForm();

      const cvInput = screen.getByLabelText(/cv \(pdf o docx/i) as HTMLInputElement;
      const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'foto.png', {
        type: 'image/png',
      });

      userEvent.upload(cvInput, pngFile);

      expect(
        await screen.findByText(/solo se permiten ficheros pdf o docx/i),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^guardar$/i })).toBeDisabled();
    });
  });

  describe('campos repetibles (useFieldArray)', () => {
    it('permite añadir y eliminar entradas de formación', async () => {
      renderForm();

      expect(screen.queryByText(/^formación 1$/i)).not.toBeInTheDocument();

      const addEducation = screen.getByRole('button', { name: /añadir formación/i });
      userEvent.click(addEducation);
      userEvent.click(addEducation);

      expect(await screen.findByText(/^formación 1$/i)).toBeInTheDocument();
      expect(await screen.findByText(/^formación 2$/i)).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button', { name: /eliminar formación/i });
      userEvent.click(removeButtons[1]);

      await waitFor(() => {
        expect(screen.queryByText(/^formación 2$/i)).not.toBeInTheDocument();
      });
      expect(screen.getByText(/^formación 1$/i)).toBeInTheDocument();
    });
  });

  describe('errores del servidor', () => {
    it('mapea 409 EMAIL_ALREADY_EXISTS a error inline en el campo email', async () => {
      mockedCreate.mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            error: 'EMAIL_ALREADY_EXISTS',
            message: 'Ya existe un candidato con ese email',
          },
        },
      });

      renderForm();
      await fillMinimalRequiredFields();
      userEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

      expect(
        await screen.findByText(/ya existe un candidato con ese email/i),
      ).toBeInTheDocument();
    });

    it('muestra banner role="alert" con mensaje genérico en error de red/servidor', async () => {
      mockedCreate.mockRejectedValueOnce({ response: { status: 500 } });

      renderForm();
      await fillMinimalRequiredFields();
      userEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

      const alerts = await screen.findAllByRole('alert');
      const banner = alerts.find((el) =>
        /no se pudo guardar el candidato/i.test(el.textContent ?? ''),
      );
      expect(banner).toBeDefined();
    });
  });
});
