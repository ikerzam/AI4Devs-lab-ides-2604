// Loads backend/.env before tests and resolves ${VAR} placeholders in DATABASE_URL.
// `dotenv` does NOT expand nested variables by itself; Prisma does, but plain
// `process.env.DATABASE_URL` reads must be resolved here for any code that
// inspects it directly.
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('${')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
    /\$\{([A-Z0-9_]+)\}/gi,
    (_match, name: string) => process.env[name] ?? '',
  );
}

// Silence noisy console.error coming from the global error handler under tests.
// We assert on response bodies; the stderr noise is not informative.
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const first = args[0];
  if (
    typeof first === 'string' &&
    (first.includes('[error-handler] Unhandled error') ||
      first.includes('[file-storage]'))
  ) {
    return;
  }
  originalError(...args);
};
