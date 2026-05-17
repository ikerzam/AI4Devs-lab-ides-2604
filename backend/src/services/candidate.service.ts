import path from 'path';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';
import { CandidateCreateInput, parseISODate } from '../schemas/candidate.schema';
import { deleteFileSafe } from './file-storage.service';

export class EmailAlreadyExistsError extends Error {
  readonly code = 'EMAIL_ALREADY_EXISTS';
  constructor(message = 'Ya existe un candidato con ese email') {
    super(message);
    this.name = 'EmailAlreadyExistsError';
  }
}

export class FileWriteError extends Error {
  readonly code = 'FILE_WRITE_ERROR';
  constructor(message = 'No se pudo persistir el fichero del CV') {
    super(message);
    this.name = 'FileWriteError';
  }
}

export interface CvFileInput {
  absolutePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CreateCandidateParams {
  data: CandidateCreateInput;
  cvFile?: CvFileInput | null;
}

export async function createCandidate(params: CreateCandidateParams) {
  const { data, cvFile } = params;

  try {
    const candidate = await prisma.$transaction(async (tx) => {
      return tx.candidate.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone ?? null,
          addressStreet: data.address?.street ?? null,
          addressCity: data.address?.city ?? null,
          addressPostalCode: data.address?.postalCode ?? null,
          addressCountry: data.address?.country ?? null,
          // Persist only the basename. The absolute folder is implicit
          // (`CV_UPLOADS_DIR`) and is recomputed at read time. This avoids
          // leaking host paths into the DB and gives defense-in-depth against
          // path traversal when the basename is later joined with the dir.
          cvFilePath: cvFile?.absolutePath ? path.basename(cvFile.absolutePath) : null,
          cvOriginalName: cvFile?.originalName ?? null,
          cvMimeType: cvFile?.mimeType ?? null,
          cvSizeBytes: cvFile?.sizeBytes ?? null,
          educations: data.educations.length
            ? {
                create: data.educations.map((edu) => ({
                  institution: edu.institution,
                  degree: edu.degree,
                  fieldOfStudy: edu.fieldOfStudy ?? null,
                  startDate: parseISODate(edu.startDate),
                  endDate: edu.endDate ? parseISODate(edu.endDate) : null,
                })),
              }
            : undefined,
          experiences: data.experiences.length
            ? {
                create: data.experiences.map((exp) => ({
                  company: exp.company,
                  position: exp.position,
                  description: exp.description ?? null,
                  startDate: parseISODate(exp.startDate),
                  endDate: exp.endDate ? parseISODate(exp.endDate) : null,
                })),
              }
            : undefined,
        },
        include: {
          educations: true,
          experiences: true,
        },
      });
    });

    return candidate;
  } catch (err: unknown) {
    // Rollback uploaded file if transaction failed after multer wrote it.
    await deleteFileSafe(cvFile?.absolutePath);

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined) ?? [];
      if (target.includes('email')) {
        throw new EmailAlreadyExistsError();
      }
    }
    throw err;
  }
}

export async function findCandidateById(id: number) {
  return prisma.candidate.findUnique({
    where: { id },
    include: {
      educations: { orderBy: { startDate: 'asc' } },
      experiences: { orderBy: { startDate: 'asc' } },
    },
  });
}
