import { z } from 'zod';

// RFC 5322 simplified email regex; zod's .email() is good enough for our case.
const EMAIL_MAX = 255;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Fecha inválida' });

const todayMidnightUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const parseISODate = (value: string): Date => {
  // YYYY-MM-DD interpreted as UTC midnight to avoid timezone drift.
  const [y, m, d] = value.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(y, m - 1, d));
};

const educationSchema = z
  .object({
    institution: z
      .string()
      .trim()
      .min(2, 'La institución es obligatoria')
      .max(150, 'Máx. 150 caracteres'),
    degree: z
      .string()
      .trim()
      .min(2, 'El título es obligatorio')
      .max(150, 'Máx. 150 caracteres'),
    fieldOfStudy: z
      .string()
      .trim()
      .max(150, 'Máx. 150 caracteres')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    startDate: isoDate,
    endDate: isoDate.nullable().optional(),
  })
  .superRefine((edu, ctx) => {
    const start = parseISODate(edu.startDate);
    if (start.getTime() > todayMidnightUTC().getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: 'Fecha inválida',
      });
    }
    if (edu.endDate) {
      const end = parseISODate(edu.endDate);
      if (end.getTime() <= start.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'La fecha de fin debe ser posterior a la de inicio',
        });
      }
    }
  });

const experienceSchema = z
  .object({
    company: z
      .string()
      .trim()
      .min(2, 'La empresa es obligatoria')
      .max(150, 'Máx. 150 caracteres'),
    position: z
      .string()
      .trim()
      .min(2, 'El puesto es obligatorio')
      .max(150, 'Máx. 150 caracteres'),
    description: z
      .string()
      .trim()
      .max(1000, 'Máx. 1000 caracteres')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    startDate: isoDate,
    endDate: isoDate.nullable().optional(),
  })
  .superRefine((exp, ctx) => {
    const start = parseISODate(exp.startDate);
    if (start.getTime() > todayMidnightUTC().getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: 'Fecha inválida',
      });
    }
    if (exp.endDate) {
      const end = parseISODate(exp.endDate);
      if (end.getTime() <= start.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'La fecha de fin debe ser posterior a la de inicio',
        });
      }
    }
  });

const addressSchema = z
  .object({
    street: z.string().trim().max(150, 'Máx. 150 caracteres').optional(),
    city: z.string().trim().max(100, 'Máx. 100 caracteres').optional(),
    postalCode: z.string().trim().max(20, 'Máx. 20 caracteres').optional(),
    country: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/u, 'País no válido')
      .transform((v) => v.toUpperCase())
      .optional(),
  })
  .optional();

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,19}$/u, 'Introduce un teléfono válido')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const candidateCreateSchema = z.object({
  firstName: z
    .string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(2, 'El nombre es obligatorio')
    .max(50, 'Máx. 50 caracteres'),
  lastName: z
    .string({ required_error: 'Los apellidos son obligatorios' })
    .trim()
    .min(2, 'Los apellidos son obligatorios')
    .max(100, 'Máx. 100 caracteres'),
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .trim()
    .min(1, 'El email es obligatorio')
    .max(EMAIL_MAX, `Máx. ${EMAIL_MAX} caracteres`)
    .email('Introduce un email válido')
    .transform((v) => v.toLowerCase()),
  phone: phoneSchema,
  address: addressSchema,
  educations: z.array(educationSchema).optional().default([]),
  experiences: z.array(experienceSchema).optional().default([]),
});

export type CandidateCreateInput = z.infer<typeof candidateCreateSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;

export { parseISODate };
