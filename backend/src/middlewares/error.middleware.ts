import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { InvalidFileError, MAX_CV_SIZE_BYTES } from './upload.middleware';
import { EmailAlreadyExistsError, FileWriteError } from '../services/candidate.service';
import { deleteFileSafe } from '../services/file-storage.service';

export interface ValidationDetail {
  field: string;
  message: string;
}

export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  readonly details: ValidationDetail[];

  constructor(details: ValidationDetail[]) {
    super('Validación fallida');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Best-effort cleanup of partial uploads:
  // - `req.file?.path` covers the case where multer finished writing the file.
  // - `req.cvDiskPath` covers the case where multer aborted mid-write
  //   (e.g. LIMIT_FILE_SIZE) — `req.file` stays undefined but bytes may have
  //   been flushed to disk by `diskStorage`.
  if (req.file?.path) {
    void deleteFileSafe(req.file.path);
  }
  if (req.cvDiskPath && req.cvDiskPath !== req.file?.path) {
    void deleteFileSafe(req.cvDiskPath);
  }

  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.code, details: err.details });
    return;
  }

  if (err instanceof InvalidFileError) {
    res.status(400).json({
      error: err.code,
      message: err.message,
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: 'INVALID_FILE',
        message: `El fichero no puede superar ${Math.floor(MAX_CV_SIZE_BYTES / (1024 * 1024))} MB`,
      });
      return;
    }
    res.status(400).json({ error: 'INVALID_FILE', message: err.message });
    return;
  }

  if (err instanceof EmailAlreadyExistsError) {
    res.status(409).json({ error: err.code, message: err.message });
    return;
  }

  if (err instanceof FileWriteError) {
    res.status(500).json({ error: err.code, message: err.message });
    return;
  }

  // Avoid logging the raw error object: it may include `err.meta`, request body
  // copies or PII (emails, phone numbers). Stick to non-sensitive metadata.
  const redacted = err as { name?: string; code?: string; message?: string; stack?: string };
  // eslint-disable-next-line no-console
  console.error('[error-handler] Unhandled error', {
    name: redacted?.name,
    code: redacted?.code,
    message: redacted?.message,
    stack: redacted?.stack,
  });
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error interno del servidor' });
}
