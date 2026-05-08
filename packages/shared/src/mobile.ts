const MY_MOBILE_REGEX = /^\+601[0-46-9][0-9]{7,8}$/;

/**
 * Normalizes a raw Malaysian mobile number string to E.164 format.
 * Pipeline: strip non-digit chars → normalize prefix → prepend +
 */
export function normalizeMobile(raw: string): string {
  let digits = raw.replace(/[\s\-()+ ]/g, '');

  if (digits.startsWith('60')) {
    // already correct prefix
  } else if (digits.startsWith('0')) {
    digits = '60' + digits.slice(1);
  } else if (digits.startsWith('1')) {
    digits = '60' + digits;
  }

  return '+' + digits;
}

/** Validates that a normalized E.164 string is a valid MY mobile number. */
export function validateMobile(normalized: string): boolean {
  return MY_MOBILE_REGEX.test(normalized);
}
