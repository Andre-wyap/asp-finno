import crypto from 'node:crypto';

export type SenangPayStatus = 'pending' | 'success' | 'failed';

export type SenangPayReturnParams = {
  statusId: string;
  orderId: string;
  transactionId: string;
  message: string;
  hash: string;
};

const SANDBOX_PAYMENT_BASE_URL = 'https://sandbox.senangpay.my/payment';
const LIVE_PAYMENT_BASE_URL = 'https://app.senangpay.my/payment';

export function getSenangPayConfig() {
  const merchantId = process.env.SENANGPAY_MERCHANT_ID;
  const secret = process.env.SENANGPAY_SECRET;
  const mode = process.env.SENANGPAY_MODE ?? 'production';

  if (!merchantId) {
    throw new Error('SENANGPAY_MERCHANT_ID is required');
  }

  if (!secret) {
    throw new Error('SENANGPAY_SECRET is required');
  }

  return {
    merchantId,
    secret,
    paymentBaseUrl: mode === 'production' ? LIVE_PAYMENT_BASE_URL : SANDBOX_PAYMENT_BASE_URL
  };
}

export function formatAmount(amount: number) {
  return amount.toFixed(2);
}

function hmacSha256(value: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

export function generatePaymentHash({
  secret,
  detail,
  amount,
  orderId
}: {
  secret: string;
  detail: string;
  amount: string;
  orderId: string;
}) {
  return hmacSha256(`${secret}${detail}${amount}${orderId}`, secret);
}

export function generateReturnHash({
  secret,
  statusId,
  orderId,
  transactionId,
  message
}: {
  secret: string;
  statusId: string;
  orderId: string;
  transactionId: string;
  message: string;
}) {
  return hmacSha256(`${secret}${statusId}${orderId}${transactionId}${message}`, secret);
}

export function verifyReturnHash(params: SenangPayReturnParams, secret: string) {
  if (!params.hash) {
    return false;
  }

  const expected = generateReturnHash({
    secret,
    statusId: params.statusId,
    orderId: params.orderId,
    transactionId: params.transactionId,
    message: params.message
  });

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.hash));
  } catch {
    return false;
  }
}

export function mapSenangPayStatus(statusId: string): SenangPayStatus {
  if (statusId === '1') {
    return 'success';
  }

  if (statusId === '2') {
    return 'pending';
  }

  return 'failed';
}

export function buildPaymentUrl({
  merchantId,
  paymentBaseUrl,
  detail,
  amount,
  orderId,
  hash,
  name,
  email,
  phone,
  timeoutSeconds = 900
}: {
  merchantId: string;
  paymentBaseUrl: string;
  detail: string;
  amount: string;
  orderId: string;
  hash: string;
  name: string;
  email: string;
  phone: string;
  timeoutSeconds?: number;
}) {
  const url = new URL(`${paymentBaseUrl}/${merchantId}`);

  url.searchParams.set('detail', detail);
  url.searchParams.set('amount', amount);
  url.searchParams.set('order_id', orderId);
  url.searchParams.set('hash', hash);
  url.searchParams.set('name', name);
  url.searchParams.set('email', email);
  url.searchParams.set('phone', phone);
  url.searchParams.set('timeout', String(timeoutSeconds));

  return url.toString();
}

export function parseSenangPayParams(input: URLSearchParams) {
  return {
    statusId: input.get('status_id') ?? '',
    orderId: input.get('order_id') ?? '',
    transactionId: input.get('transaction_id') ?? '',
    message: input.get('msg') ?? '',
    hash: input.get('hash') ?? ''
  };
}
