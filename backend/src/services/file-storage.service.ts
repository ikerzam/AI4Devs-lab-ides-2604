import fs from 'fs/promises';
import path from 'path';

export const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads');
export const CV_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'cvs');

export async function ensureCvUploadsDir(): Promise<void> {
  await fs.mkdir(CV_UPLOADS_DIR, { recursive: true });
}

export async function deleteFileSafe(absolutePath: string | null | undefined): Promise<void> {
  if (!absolutePath) return;
  try {
    await fs.unlink(absolutePath);
  } catch (err: unknown) {
    // Swallow ENOENT, log everything else without throwing — file rollback is best-effort.
    const error = err as NodeJS.ErrnoException;
    if (error && error.code !== 'ENOENT') {
      // eslint-disable-next-line no-console
      console.error('[file-storage] Failed to unlink file', absolutePath, error);
    }
  }
}

// Magic bytes for the supported CV formats:
// - PDF: `%PDF-` -> 25 50 44 46 2D
// - DOCX: ZIP container -> 50 4B 03 04
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Reads the first few bytes of a freshly-uploaded file and verifies they match
 * the magic numbers expected for the declared MIME type. Multer only validates
 * the client-provided `Content-Type` and extension — both are trivially
 * spoofable — so we re-check on the server side before trusting the file.
 *
 * Returns `true` when the file matches, `false` when it does not (caller is
 * expected to delete the file and surface an `INVALID_FILE` error).
 */
export async function verifyFileMagicNumbers(
  absolutePath: string,
  declaredMimeType: string,
): Promise<boolean> {
  let handle: import('fs/promises').FileHandle | null = null;
  try {
    handle = await fs.open(absolutePath, 'r');
    const buf = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buf, 0, 8, 0);
    const head = buf.subarray(0, bytesRead);

    if (declaredMimeType === 'application/pdf') {
      return head.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC);
    }
    if (declaredMimeType === DOCX_MIME) {
      return head.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC);
    }
    // Unknown declared MIME — multer should have already rejected it, but
    // refuse defensively if we ever get here.
    return false;
  } catch {
    return false;
  } finally {
    if (handle) {
      await handle.close().catch(() => undefined);
    }
  }
}
