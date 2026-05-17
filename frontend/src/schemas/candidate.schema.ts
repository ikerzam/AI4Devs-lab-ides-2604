import { z } from 'zod';

// Mirror of the backend validation to keep client/server in sync.

const todayMidnightUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const parseISODate = (value: string): Date => {
  const [y, m, d] = value.split('-').map((p) => Number.parseInt(p, 10));
  return new Date(Date.UTC(y, m - 1, d));
};

const isoDate = z
  .string()
  .min(1, 'Fecha inválida')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');

const optionalIsoDate = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((v) => (v === '' || v === undefined ? undefined : v))
  .refine((v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Fecha inválida');

export const educationFormSchema = z
  .object({
    institution: z.string().trim().min(2, 'La institución es obligatoria').max(150),
    degree: z.string().trim().min(2, 'El título es obligatorio').max(150),
    fieldOfStudy: z.string().trim().max(150).optional(),
    startDate: isoDate,
    endDate: optionalIsoDate,
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

export const experienceFormSchema = z
  .object({
    company: z.string().trim().min(2, 'La empresa es obligatoria').max(150),
    position: z.string().trim().min(2, 'El puesto es obligatorio').max(150),
    description: z.string().trim().max(1000).optional(),
    startDate: isoDate,
    endDate: optionalIsoDate,
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

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

export const candidateFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'El nombre es obligatorio')
    .max(50, 'Máx. 50 caracteres'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Los apellidos son obligatorios')
    .max(100, 'Máx. 100 caracteres'),
  email: z
    .string()
    .trim()
    .min(1, 'El email es obligatorio')
    .max(255, 'Máx. 255 caracteres')
    .email('Introduce un email válido'),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,19}$/u, 'Introduce un teléfono válido')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  address: z
    .object({
      street: optionalText(150),
      city: optionalText(100),
      postalCode: optionalText(20),
      country: z
        .string()
        .trim()
        .regex(/^[A-Za-z]{2}$/u, 'País no válido')
        .optional()
        .or(z.literal('').transform(() => undefined)),
    })
    .optional(),
  educations: z.array(educationFormSchema).optional(),
  experiences: z.array(experienceFormSchema).optional(),
});

export type CandidateFormValues = z.input<typeof candidateFormSchema>;
export type CandidateFormParsed = z.output<typeof candidateFormSchema>;
