// CJS-friendly stub of `uuid` for the Jest environment.
// The real `uuid@14` ships as ESM-only which ts-jest cannot transform.
// We only use `v4` (in upload.middleware) so this is sufficient for tests.

let counter = 0;

export function v4(): string {
  counter += 1;
  // Deterministic but unique per test run for collision-free filenames.
  return `00000000-0000-0000-0000-${counter.toString().padStart(12, '0')}`;
}

export default { v4 };
