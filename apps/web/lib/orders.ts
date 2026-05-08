import crypto from 'node:crypto';

const ORDER_RANDOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateOrderId(date = new Date()) {
  const yyyymmdd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('');

  let random = '';
  const bytes = crypto.randomBytes(8);

  for (const byte of bytes) {
    random += ORDER_RANDOM_ALPHABET[byte % ORDER_RANDOM_ALPHABET.length];
  }

  return `ASP-${yyyymmdd}-${random}`;
}
