import { candidateCreateSchema, parseISODate } from '../schemas/candidate.schema';

describe('candidateCreateSchema', () => {
  const validMinimal = {
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
  };

  describe('happy paths', () => {
    it('acepta el payload mínimo y normaliza email a minúsculas con educations/experiences vacíos', () => {
      const result = candidateCreateSchema.safeParse({
        firstName: 'Ana',
        lastName: 'García',
        email: 'ANA@Example.COM',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('ana@example.com');
        expect(result.data.educations).toEqual([]);
        expect(result.data.experiences).toEqual([]);
      }
    });

    it('acepta un payload completo con educación y experiencia válidas', () => {
      const result = candidateCreateSchema.safeParse({
        ...validMinimal,
        phone: '+34 600-111-222',
        address: {
          street: 'Calle Mayor 1',
          city: 'Madrid',
          postalCode: '28001',
          country: 'es',
        },
        educations: [
          {
            institution: 'UPM',
            degree: 'Grado Informática',
            startDate: '2018-09-01',
            endDate: '2022-06-30',
          },
        ],
        experiences: [
          {
            company: 'Acme',
            position: 'Backend Dev',
            startDate: '2022-07-01',
            endDate: null,
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // country normalizado a mayúsculas
        expect(result.data.address?.country).toBe('ES');
        expect(result.data.educations).toHaveLength(1);
        expect(result.data.experiences).toHaveLength(1);
      }
    });

    it('acepta endDate nulo en educación y experiencia (en curso)', () => {
      const result = candidateCreateSchema.safeParse({
        ...validMinimal,
        educations: [
          { institution: 'UPM', degree: 'Grado', startDate: '2018-09-01', endDate: null },
        ],
        experiences: [
          { company: 'Acme', position: 'Dev', startDate: '2022-07-01' },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('campos obligatorios', () => {
    it('rechaza firstName vacío', () => {
      const result = candidateCreateSchema.safeParse({ ...validMinimal, firstName: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['firstName']);
        expect(result.error.issues[0].message).toMatch(/nombre/i);
      }
    });

    it('rechaza firstName demasiado largo (>50)', () => {
      const result = candidateCreateSchema.safeParse({
        ...validMinimal,
        firstName: 'A'.repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it('rechaza lastName vacío', () => {
      const result = candidateCreateSchema.safeParse({ ...validMinimal, lastName: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['lastName']);
      }
    });

    it('rechaza email vacío', () => {
      const result = candidateCreateSchema.safeParse({ ...validMinimal, email: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['email']);
      }
    });

    it('rechaza email con formato inválido', () => {
      const result = candidateCreateSchema.safeParse({ ...validMinimal, email: 'no-es-email' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === 'email');
        expect(issue?.message).toMatch(/email válido/i);
      }
    });

    it('rechaza email con más de 255 caracteres', () => {
      // 260 caracteres totales (256 local + '@x.io' = 261)
      const longLocal = 'a'.repeat(256);
      const result = candidateCreateSchema.safeParse({
        ...validMinimal,
        email: `${longLocal}@x.io`,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('campos opcionales', () => {
    it('rechaza teléfono con caracteres no válidos', () => {
      const result = candidateCreateSchema.safeParse({
        ...validMinimal,
        phone: 'abc123',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza country con formato no ISO 3166-1 alpha-2', () => {
      const result = candidateCreateSchema.safeParse({
        ...validMinimal,
        address: { country: 'ESP' },
      });
      expect(result.success).toBe(false);
    });

    it('acepta phone vacío (lo trata como undefined)', () => {
      const result = candidateCreateSchema.safeParse({ ...validMinimal, phone: '' });
      expect(result.success).toBe(true);
    });
  });

  describe('fechas en educación', () => {
    it('rechaza endDate anterior a startDate', () => {
      const result = candidateCreateSchema.safeParse({
        ...validMinimal,
        educations: [
          { institution: 'UPM', degree: 'Grado', startDate: '2022-01-01', endDate: '2021-01-01' },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (i) => i.path.join('.') === 'educations.0.endDate',
        );
        expect(issue?.message).toMatch(/posterior a la de inicio/i);
      }
    });

    it('rechaza endDate igual a startDate', () => {
      const result = candidateCreateSchema.safeParse({
        ...validMinimal,
        educations: [
          { institution: 'UPM', degree: 'Grado', startDate: '2022-01-01', endDate: '2022-01-01' },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('rechaza startDate en el futuro', () => {
      const result = candidateCreateSchema.safeParse({
        ...validMinimal,
        educations: [
          { institution: 'UPM', degree: 'Grado', startDate: '2999-01-01' },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('rechaza institution con menos de 2 caracteres', () => {
      const result = candidateCreateSchema.safeParse({
        ...validMinimal,
        educations: [{ institution: 'U', degree: 'Grado', startDate: '2020-01-01' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('fechas en experiencia', () => {
    it('rechaza endDate anterior a startDate', () => {
      const result = candidateCreateSchema.safeParse({
        ...validMinimal,
        experiences: [
          { company: 'Acme', position: 'Dev', startDate: '2023-01-01', endDate: '2022-01-01' },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (i) => i.path.join('.') === 'experiences.0.endDate',
        );
        expect(issue?.message).toMatch(/posterior a la de inicio/i);
      }
    });
  });
});

describe('parseISODate', () => {
  it('convierte YYYY-MM-DD a UTC midnight Date', () => {
    const d = parseISODate('2022-06-30');
    expect(d.toISOString()).toBe('2022-06-30T00:00:00.000Z');
  });
});
