import crypto from 'node:crypto';

export function normalizeNricForHash(nric: string) {
  return nric.replace(/[^0-9]/g, '');
}

export function hashNric(nric: string, pepper: string) {
  if (!pepper) {
    throw new Error('NRIC_HASH_PEPPER is required');
  }

  return crypto.createHmac('sha256', pepper).update(normalizeNricForHash(nric)).digest('hex');
}
