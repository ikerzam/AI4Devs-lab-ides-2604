import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { ZodError } from 'zod';
import { candidateCreateSchema } from '../schemas/candidate.schema';
import { createCandidate, findCandidateById } from '../services/candidate.service';
import {
  CV_UPLOADS_DIR,
  deleteFileSafe,
  verifyFileMagicNumbers,
} from '../services/file-storage.service';
import { ValidationError } from '../middlewares/error.middleware';
import { InvalidFileError } from '../middlewares/upload.middleware';

function buildCvUrl(req: Request, candidateId: number): string {
  return `${req.protocol}://${req.get('host')}/api/candidates/${candidateId}/cv`;
}

export async function postCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Multer placed the raw text fields in req.body, the file (if any) in req.file.
  const rawData = (req.body as { data?: unknown }).data;

  if (typeof rawData !== 'string' || rawData.trim() === '') {
    await deleteFileSafe(req.file?.path);
    next(
      new ValidationError([
        { field: 'data', message: 'El campo "data" es obligatorio (JSON con el candidato)' },
      ]),
    );
    return;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawData);
  } catch {
    await deleteFileSafe(req.file?.path);
    next(
      new ValidationError([
        { field: 'data', message: 'El campo "data" no contiene JSON válido' },
      ]),
    );
    return;
  }

  const parseResult = candidateCreateSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    await deleteFileSafe(req.file?.path);
    next(zodErrorToValidationError(parseResult.error));
    return;
  }

  // Defense-in-depth: multer already filtered by MIME + extension, but a
  // malicious client can lie about both. Check the magic bytes on disk.
  if (req.file) {
    const magicOk = await verifyFileMagicNumbers(req.file.path, req.file.mimetype);
    if (!magicOk) {
      await deleteFileSafe(req.file.path);
      next(new InvalidFileError('El fichero no es un PDF o DOCX válido'));
      return;
    }
  }

  try {
    const candidate = await createCandidate({
      data: parseResult.data,
      cvFile: req.file
        ? {
            absolutePath: req.file.path,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
          }
        : null,
    });

    res.status(201).json({
      id: candidate.id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      address: {
        street: candidate.addressStreet,
        city: candidate.addressCity,
        postalCode: candidate.addressPostalCode,
        country: candidate.addressCountry,
      },
      educations: candidate.educations,
      experiences: candidate.experiences,
      cvUrl: candidate.cvFilePath ? buildCvUrl(req, candidate.id) : null,
      createdAt: candidate.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    next(new ValidationError([{ field: 'id', message: 'Identificador de candidato inválido' }]));
    return;
  }

  try {
    const candidate = await findCandidateById(id);
    if (!candidate) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Candidato no encontrado' });
      return;
    }

    res.status(200).json({
      id: candidate.id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      address: {
        street: candidate.addressStreet,
        city: candidate.addressCity,
        postalCode: candidate.addressPostalCode,
        country: candidate.addressCountry,
      },
      educations: candidate.educations,
      experiences: candidate.experiences,
      cv: candidate.cvFilePath
        ? {
            url: buildCvUrl(req, candidate.id),
            originalName: candidate.cvOriginalName,
            mimeType: candidate.cvMimeType,
            sizeBytes: candidate.cvSizeBytes,
          }
        : null,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCandidateCv(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    next(new ValidationError([{ field: 'id', message: 'Identificador de candidato inválido' }]));
    return;
  }

  try {
    const candidate = await findCandidateById(id);
    if (!candidate || !candidate.cvFilePath) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'CV no encontrado' });
      return;
    }

    // `cvFilePath` is stored as the basename only. Rebuild the absolute path
    // and ensure the resolution stays inside CV_UPLOADS_DIR — guards against
    // a tampered DB row trying to escape the uploads folder.
    const storedBasename = path.basename(candidate.cvFilePath);
    const filePath = path.resolve(CV_UPLOADS_DIR, storedBasename);
    const uploadsRoot = path.resolve(CV_UPLOADS_DIR);
    if (!filePath.startsWith(uploadsRoot + path.sep) && filePath !== uploadsRoot) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'CV no encontrado' });
      return;
    }
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'CV no encontrado en almacenamiento' });
      return;
    }

    const downloadName = candidate.cvOriginalName ?? storedBasename;
    res.setHeader('Content-Type', candidate.cvMimeType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', buildContentDisposition(downloadName));
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
}

/**
 * Builds an RFC 5987 compliant `Content-Disposition` header so non-ASCII
 * filenames (acentos, ñ, etc.) are preserved by modern user agents while
 * legacy ones fall back to the ASCII-safe `filename=`.
 */
function buildContentDisposition(originalName: string): string {
  const asciified = originalName.replace(/[^\x20-\x7E]/g, '_') || 'cv';
  const encoded = encodeURIComponent(originalName);
  return `attachment; filename="${asciified}"; filename*=UTF-8''${encoded}`;
}

function zodErrorToValidationError(error: ZodError): ValidationError {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
  return new ValidationError(details);
}
