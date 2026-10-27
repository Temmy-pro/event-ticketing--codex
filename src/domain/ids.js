import { randomBytes, randomUUID } from 'node:crypto';

/** Returns a cryptographically random UUID. */
export function newId() {
  return randomUUID();
}

/**
 * Returns a short booking reference that is easy to read aloud.
 * Ambiguous characters (I, O, 0 and 1) are excluded.
 */
export function newReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let code = '';

  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }

  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
