export interface NricData {
  dob: string; // ISO date: YYYY-MM-DD
  gender: 'M' | 'F';
}

/**
 * Parses a 12-digit Malaysian NRIC (with or without dashes) and returns the
 * derived date of birth and gender.
 *
 * Century rule: YY > current 2-digit year → 1900s; otherwise 2000s.
 * This covers the valid entry-age range of 18–65 years old without ambiguity
 * for any year between 1961 and the current year.
 */
export function parseNric(nric: string): NricData | null {
  const digits = nric.replace(/-/g, '');
  if (!/^\d{12}$/.test(digits)) return null;

  const yy = parseInt(digits.slice(0, 2), 10);
  const mm = parseInt(digits.slice(2, 4), 10);
  const dd = parseInt(digits.slice(4, 6), 10);

  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;

  const currentYY = new Date().getFullYear() % 100;
  const century = yy > currentYY ? 1900 : 2000;
  const year = century + yy;

  const dob = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const gender: 'M' | 'F' = parseInt(digits[11], 10) % 2 === 1 ? 'M' : 'F';

  return { dob, gender };
}

export function validateNric(nric: string): boolean {
  return parseNric(nric) !== null;
}
