import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { deleteFileSafe } from '../services/file-storage.service';

describe('deleteFileSafe', () => {
  it('no lanza error si el path es null/undefined', async () => {
    await expect(deleteFileSafe(null)).resolves.toBeUndefined();
    await expect(deleteFileSafe(undefined)).resolves.toBeUndefined();
    await expect(deleteFileSafe('')).resolves.toBeUndefined();
  });

  it('no lanza error si el fichero no existe (ENOENT)', async () => {
    const nonExistent = path.join(os.tmpdir(), `lti-test-missing-${Date.now()}.tmp`);
    await expect(deleteFileSafe(nonExistent)).resolves.toBeUndefined();
  });

  it('elimina un fichero existente del disco', async () => {
    const filePath = path.join(os.tmpdir(), `lti-test-real-${Date.now()}.tmp`);
    await fs.writeFile(filePath, 'contenido de prueba');

    // sanity check
    await expect(fs.stat(filePath)).resolves.toBeDefined();

    await deleteFileSafe(filePath);

    await expect(fs.stat(filePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
