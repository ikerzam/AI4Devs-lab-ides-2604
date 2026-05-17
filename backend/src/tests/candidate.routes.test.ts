import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import { createApp } from '../app';
import prisma from '../prisma/client';
import { CV_UPLOADS_DIR } from '../services/file-storage.service';

const PDF_MIN_BUFFER = Buffer.from(
  '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF',
);
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
// DOCX is a ZIP container — start with the ZIP magic bytes for plausibility.
const DOCX_MIN_BUFFER = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from('fake-docx-content'),
]);

const app = createApp();

async function cleanCandidates() {
  // Education and WorkExperience use ON DELETE CASCADE.
  await prisma.candidate.deleteMany({});
}

async function cleanUploadedCvs() {
  try {
    const entries = await fs.readdir(CV_UPLOADS_DIR);
    await Promise.all(
      entries
        .filter((name) => name.startsWith('00000000-0000-0000-0000-'))
        .map((name) => fs.unlink(path.join(CV_UPLOADS_DIR, name)).catch(() => undefined)),
    );
  } catch {
    // dir may not exist yet
  }
}

beforeEach(async () => {
  await cleanCandidates();
  await cleanUploadedCvs();
});

afterAll(async () => {
  await cleanCandidates();
  await cleanUploadedCvs();
  await prisma.$disconnect();
});

const minimalPayload = {
  firstName: 'Ana',
  lastName: 'García',
  email: 'ana@example.com',
};

const fullPayload = {
  firstName: 'Ana',
  lastName: 'García',
  email: 'ana.full@example.com',
  phone: '+34600111222',
  address: {
    street: 'Calle Mayor 1',
    city: 'Madrid',
    postalCode: '28001',
    country: 'ES',
  },
  educations: [
    {
      institution: 'UPM',
      degree: 'Grado Informática',
      fieldOfStudy: 'Software',
      startDate: '2018-09-01',
      endDate: '2022-06-30',
    },
  ],
  experiences: [
    {
      company: 'Acme',
      position: 'Backend Dev',
      description: 'APIs con Node',
      startDate: '2022-07-01',
      endDate: null,
    },
  ],
};

describe('POST /api/candidates', () => {
  describe('happy paths', () => {
    it('crea un candidato con datos mínimos y devuelve 201', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .field('data', JSON.stringify(minimalPayload));

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        firstName: 'Ana',
        lastName: 'García',
        email: 'ana@example.com',
        cvUrl: null,
      });
      expect(res.body.id).toEqual(expect.any(Number));
      expect(res.body.educations).toEqual([]);
      expect(res.body.experiences).toEqual([]);
    });

    it('crea un candidato completo con educación y experiencia', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .field('data', JSON.stringify(fullPayload));

      expect(res.status).toBe(201);
      expect(res.body.educations).toHaveLength(1);
      expect(res.body.educations[0]).toMatchObject({
        institution: 'UPM',
        degree: 'Grado Informática',
      });
      expect(res.body.experiences).toHaveLength(1);
      expect(res.body.experiences[0]).toMatchObject({
        company: 'Acme',
        position: 'Backend Dev',
      });
    });

    it('crea un candidato con CV PDF adjunto y devuelve cvUrl', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .field('data', JSON.stringify({ ...minimalPayload, email: 'ana.pdf@example.com' }))
        .attach('cv', PDF_MIN_BUFFER, {
          filename: 'cv.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.cvUrl).toMatch(/\/api\/candidates\/\d+\/cv$/);

      // Verifica que el fichero queda en disco
      const candidate = await prisma.candidate.findUnique({ where: { id: res.body.id } });
      expect(candidate?.cvFilePath).toBeTruthy();
      expect(candidate?.cvMimeType).toBe('application/pdf');
      expect(candidate?.cvOriginalName).toBe('cv.pdf');
    });

    it('crea un candidato con CV DOCX adjunto', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .field('data', JSON.stringify({ ...minimalPayload, email: 'ana.docx@example.com' }))
        .attach('cv', DOCX_MIN_BUFFER, {
          filename: 'cv.docx',
          contentType: DOCX_MIME,
        });

      expect(res.status).toBe(201);
      const candidate = await prisma.candidate.findUnique({ where: { id: res.body.id } });
      expect(candidate?.cvMimeType).toBe(DOCX_MIME);
      expect(candidate?.cvOriginalName).toBe('cv.docx');
    });
  });

  describe('400 VALIDATION_ERROR', () => {
    it('devuelve 400 cuando el campo data falta', async () => {
      const res = await request(app).post('/api/candidates');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('devuelve 400 cuando email está vacío', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .field('data', JSON.stringify({ ...minimalPayload, email: '' }));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
      );
    });

    it('devuelve 400 cuando el email tiene formato inválido', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .field('data', JSON.stringify({ ...minimalPayload, email: 'no-es-email' }));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('devuelve 400 cuando firstName está vacío', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .field('data', JSON.stringify({ ...minimalPayload, firstName: '' }));

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'firstName' })]),
      );
    });

    it('devuelve 400 cuando lastName está vacío', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .field('data', JSON.stringify({ ...minimalPayload, lastName: '' }));

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'lastName' })]),
      );
    });

    it('devuelve 400 cuando endDate < startDate en educación', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .field(
          'data',
          JSON.stringify({
            ...minimalPayload,
            educations: [
              {
                institution: 'UPM',
                degree: 'Grado',
                startDate: '2022-01-01',
                endDate: '2021-01-01',
              },
            ],
          }),
        );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'educations.0.endDate' })]),
      );
    });

    it('devuelve 400 cuando endDate < startDate en experiencia', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .field(
          'data',
          JSON.stringify({
            ...minimalPayload,
            experiences: [
              {
                company: 'Acme',
                position: 'Dev',
                startDate: '2023-01-01',
                endDate: '2022-01-01',
              },
            ],
          }),
        );

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'experiences.0.endDate' })]),
      );
    });
  });

  describe('409 EMAIL_ALREADY_EXISTS', () => {
    it('devuelve 409 cuando se intenta crear un candidato con email duplicado', async () => {
      const first = await request(app)
        .post('/api/candidates')
        .field('data', JSON.stringify({ ...minimalPayload, email: 'dup@example.com' }));
      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/api/candidates')
        .field('data', JSON.stringify({ ...minimalPayload, email: 'dup@example.com' }));

      expect(second.status).toBe(409);
      expect(second.body.error).toBe('EMAIL_ALREADY_EXISTS');
    });
  });

  describe('400 INVALID_FILE', () => {
    it('rechaza un fichero con MIME no permitido (image/png)', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .field('data', JSON.stringify({ ...minimalPayload, email: 'png@example.com' }))
        .attach('cv', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
          filename: 'foto.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_FILE');
      // No debe haberse creado el candidato
      const existing = await prisma.candidate.findUnique({ where: { email: 'png@example.com' } });
      expect(existing).toBeNull();
    });

    it('rechaza un fichero mayor a 5 MB', async () => {
      const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 0x25); // 5 MB + 1 KB
      const res = await request(app)
        .post('/api/candidates')
        .field('data', JSON.stringify({ ...minimalPayload, email: 'big@example.com' }))
        .attach('cv', bigBuffer, {
          filename: 'cv.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_FILE');
      const existing = await prisma.candidate.findUnique({ where: { email: 'big@example.com' } });
      expect(existing).toBeNull();
    });
  });
});

describe('GET /api/candidates/:id', () => {
  it('devuelve 200 con el candidato y sus relaciones', async () => {
    const created = await request(app)
      .post('/api/candidates')
      .field('data', JSON.stringify(fullPayload));
    expect(created.status).toBe(201);

    const res = await request(app).get(`/api/candidates/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.body.id,
      firstName: 'Ana',
      lastName: 'García',
      email: 'ana.full@example.com',
    });
    expect(res.body.educations).toHaveLength(1);
    expect(res.body.experiences).toHaveLength(1);
    expect(res.body.address).toMatchObject({ city: 'Madrid', country: 'ES' });
  });

  it('devuelve 404 cuando el id no existe', async () => {
    const res = await request(app).get('/api/candidates/999999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('devuelve 400 cuando el id no es un número válido', async () => {
    const res = await request(app).get('/api/candidates/no-es-numero');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/candidates/:id/cv', () => {
  it('devuelve el fichero con Content-Disposition: attachment cuando existe', async () => {
    const created = await request(app)
      .post('/api/candidates')
      .field('data', JSON.stringify({ ...minimalPayload, email: 'cv.download@example.com' }))
      .attach('cv', PDF_MIN_BUFFER, {
        filename: 'mi-cv.pdf',
        contentType: 'application/pdf',
      });
    expect(created.status).toBe(201);

    const res = await request(app).get(`/api/candidates/${created.body.id}/cv`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toMatch(/^attachment;/);
    expect(res.headers['content-disposition']).toMatch(/mi-cv\.pdf/);
  });

  it('devuelve 404 cuando el candidato no tiene CV', async () => {
    const created = await request(app)
      .post('/api/candidates')
      .field('data', JSON.stringify({ ...minimalPayload, email: 'no.cv@example.com' }));
    expect(created.status).toBe(201);

    const res = await request(app).get(`/api/candidates/${created.body.id}/cv`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('devuelve 404 cuando el candidato no existe', async () => {
    const res = await request(app).get('/api/candidates/999999/cv');
    expect(res.status).toBe(404);
  });
});
