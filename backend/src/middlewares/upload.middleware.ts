import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Request } from 'express';
import { CV_UPLOADS_DIR, ensureCvUploadsDir } from '../services/file-storage.service';

const ALLOWED_MIME_TYPES = new Set<string>([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = new Set<string>(['.pdf', '.docx']);

export const MAX_CV_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await ensureCvUploadsDir();
      cb(null, CV_UPLOADS_DIR);
    } catch (err) {
      cb(err as Error, CV_UPLOADS_DIR);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const generatedName = `${uuidv4()}${ext}`;
    // Remember the absolute path even before multer finishes writing the file,
    // so the global error handler can clean it up if multer aborts (e.g. on
    // LIMIT_FILE_SIZE the partial file is left on disk and `req.file` stays
    // undefined).
    req.cvDiskPath = path.join(CV_UPLOADS_DIR, generatedName);
    cb(null, generatedName);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    cb(new InvalidFileError('Solo se permiten ficheros PDF o DOCX'));
    return;
  }
  cb(null, true);
};

export class InvalidFileError extends Error {
  readonly code = 'INVALID_FILE';
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFileError';
  }
}

export const uploadCv = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_CV_SIZE_BYTES,
    files: 1,
  },
}).single('cv');
