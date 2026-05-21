const MY_MOBILE_REGEX = /^601[0-46-9][0-9]{7,8}$/;

/**
 * Normalizes a raw Malaysian mobile number string to canonical 60-prefixed format.
 * Pipeline: strip non-digits -> normalize prefix -> return 601XXXXXXXX.
 */
export function normalizeMobile(raw: string): string {
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('60')) {
    // Already has Malaysia country code.
  } else if (digits.startsWith('0')) {
    digits = '60' + digits.slice(1);
  } else if (digits.startsWith('1')) {
    digits = '60' + digits;
  }

  return digits;
}

/** Validates that a normalized string is a valid MY mobile number. */
export function validateMobile(normalized: string): boolean {
  return MY_MOBILE_REGEX.test(normalized);
}
