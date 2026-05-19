import crypto from 'node:crypto';

export type DokuProviderStatus = 'pending' | 'success' | 'failed';

type DokuConfig = {
  clientId: string;
  secretKey: string;
  apiBaseUrl: string;
  currency: string;
  amountMultiplier: number;
  paymentDueDateMinutes: number;
  paymentMethodTypes: string[] | null;
};

type CreateDokuCheckoutPaymentInput = {
  orderId: string;
  invoiceNumber?: string;
  amount: number;
  detail: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  baseUrl: string;
};

export type DokuCheckoutPayment = {
  redirectUrl: string;
  requestId: string;
  invoiceNumber: string;
  tokenId: string | null;
  sessionId: string | null;
  providerAmount: number;
  currency: string;
  rawResponse: unknown;
};

export type DokuNotification = {
  orderId: string;
  invoiceNumber: string;
  providerStatus: DokuProviderStatus;
  transactionStatus: string;
  transactionId: string;
  transactionDate: string | null;
  channelId: string | null;
  serviceId: string | null;
  acquirerId: string | null;
  message: string;
  raw: Record<string, unknown>;
};

const SANDBOX_API_BASE_URL = 'https://api-sandbox.doku.com';
const LIVE_API_BASE_URL = 'https://api.doku.com';
const CHECKOUT_PAYMENT_PATH = '/checkout/v1/payment';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function getDokuConfig(): DokuConfig {
  const mode = process.env.DOKU_MODE ?? 'sandbox';
  const amountMultiplier = Number(process.env.DOKU_AMOUNT_MULTIPLIER ?? '1');
  const paymentDueDateMinutes = Number(process.env.DOKU_PAYMENT_DUE_DATE_MINUTES ?? '60');
  const paymentMethodTypes =
    process.env.DOKU_PAYMENT_METHOD_TYPES?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? null;

  if (!Number.isFinite(amountMultiplier) || amountMultiplier <= 0) {
    throw new Error('DOKU_AMOUNT_MULTIPLIER must be a positive number');
  }

  if (!Number.isFinite(paymentDueDateMinutes) || paymentDueDateMinutes <= 0) {
    throw new Error('DOKU_PAYMENT_DUE_DATE_MINUTES must be a positive number');
  }

  return {
    clientId: requiredEnv('DOKU_CLIENT_ID'),
    secretKey: requiredEnv('DOKU_SECRET_KEY'),
    apiBaseUrl: mode === 'production' ? LIVE_API_BASE_URL : SANDBOX_API_BASE_URL,
    currency: process.env.DOKU_CURRENCY ?? 'MYR',
    amountMultiplier,
    paymentDueDateMinutes,
    paymentMethodTypes
  };
}

export function toDokuTimestamp(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function generateDokuDigest(body: string) {
  return crypto.createHash('sha256').update(body, 'utf8').digest('base64');
}

export function generateDokuSignature({
  clientId,
  requestId,
  timestamp,
  requestTarget,
  digest,
  secretKey,
  timestampHeader = 'Request-Timestamp'
}: {
  clientId: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  digest?: string;
  secretKey: string;
  timestampHeader?: 'Request-Timestamp' | 'Response-Timestamp';
}) {
  const components = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `${timestampHeader}:${timestamp}`,
    `Request-Target:${requestTarget}`
  ];

  if (digest) {
    components.push(`Digest:${digest}`);
  }

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(components.join('\n'))
    .digest('base64');

  return `HMACSHA256=${signature}`;
}

function timingSafeEqualString(a: string, b: string) {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function verifyDokuSignature({
  clientId,
  requestId,
  timestamp,
  requestTarget,
  digest,
  signature,
  secretKey,
  timestampHeader = 'Request-Timestamp'
}: {
  clientId: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  digest?: string;
  signature: string;
  secretKey: string;
  timestampHeader?: 'Request-Timestamp' | 'Response-Timestamp';
}) {
  if (!clientId || !requestId || !timestamp || !requestTarget || !signature) {
    return false;
  }

  const expected = generateDokuSignature({
    clientId,
    requestId,
    timestamp,
    requestTarget,
    digest,
    secretKey,
    timestampHeader
  });

  return timingSafeEqualString(expected, signature);
}

function dokuAmount(amount: number, amountMultiplier: number) {
  return Math.round(amount * amountMultiplier);
}

function cleanPhone(phone: string) {
  return phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
}

function dokuResultUrl(baseUrl: string, orderId: string) {
  const url = new URL('/payment/result', baseUrl);
  url.searchParams.set('provider', 'doku');
  url.searchParams.set('orderId', orderId);
  return url.toString();
}

export async function createDokuCheckoutPayment({
  orderId,
  invoiceNumber = orderId,
  amount,
  detail,
  customer,
  baseUrl
}: CreateDokuCheckoutPaymentInput): Promise<DokuCheckoutPayment> {
  const config = getDokuConfig();
  const requestId = crypto.randomUUID();
  const requestTimestamp = toDokuTimestamp();
  const providerAmount = dokuAmount(amount, config.amountMultiplier);
  const notificationUrl = new URL('/api/doku/notification', baseUrl).toString();
  const payment: Record<string, unknown> = {
    payment_due_date: config.paymentDueDateMinutes
  };

  if (config.paymentMethodTypes && config.paymentMethodTypes.length > 0) {
    payment.payment_method_types = config.paymentMethodTypes;
  }

  const body = JSON.stringify({
    order: {
      amount: providerAmount,
      invoice_number: invoiceNumber,
      currency: config.currency,
      callback_url: dokuResultUrl(baseUrl, orderId),
      callback_url_result: dokuResultUrl(baseUrl, orderId),
      language: 'EN',
      auto_redirect: true,
      line_items: [
        {
          id: invoiceNumber,
          name: detail,
          price: providerAmount,
          quantity: 1
        }
      ]
    },
    payment,
    customer: {
      id: orderId,
      name: customer.name,
      email: customer.email,
      phone: cleanPhone(customer.phone),
      address: customer.address,
      country: 'MY'
    },
    additional_info: {
      override_notification_url: notificationUrl
    }
  });
  const digest = generateDokuDigest(body);
  const signature = generateDokuSignature({
    clientId: config.clientId,
    requestId,
    timestamp: requestTimestamp,
    requestTarget: CHECKOUT_PAYMENT_PATH,
    digest,
    secretKey: config.secretKey
  });
  const response = await fetch(`${config.apiBaseUrl}${CHECKOUT_PAYMENT_PATH}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Client-Id': config.clientId,
      'Request-Id': requestId,
      'Request-Timestamp': requestTimestamp,
      Signature: signature
    },
    body
  });
  const responseText = await response.text();
  let responseBody: Record<string, unknown>;

  try {
    const parsed: unknown = JSON.parse(responseText);
    if (!isRecord(parsed)) {
      throw new Error('DOKU response root is not an object');
    }
    responseBody = parsed;
  } catch {
    throw new Error(`DOKU returned a non-JSON response (${response.status})`);
  }

  if (!response.ok) {
    const responseMessage = responseBody.message;
    const message = Array.isArray(responseMessage)
      ? responseMessage.join(', ')
      : responseMessage || `DOKU checkout failed with HTTP ${response.status}`;
    throw new Error(String(message));
  }

  const responseUrl = stringAt(responseBody, 'response.payment.url');

  if (typeof responseUrl !== 'string' || !responseUrl) {
    throw new Error('DOKU checkout response did not include response.payment.url');
  }

  const responseSignature = response.headers.get('signature');
  const responseTimestamp = response.headers.get('response-timestamp');

  if (responseSignature && responseTimestamp) {
    const responseDigest = generateDokuDigest(responseText);
    const responseSignatureValid = verifyDokuSignature({
      clientId: config.clientId,
      requestId,
      timestamp: responseTimestamp,
      requestTarget: CHECKOUT_PAYMENT_PATH,
      digest: responseDigest,
      signature: responseSignature,
      secretKey: config.secretKey,
      timestampHeader: 'Response-Timestamp'
    });

    if (!responseSignatureValid) {
      throw new Error('DOKU response signature verification failed');
    }
  }

  return {
    redirectUrl: responseUrl,
    requestId,
    invoiceNumber,
    tokenId: stringAt(responseBody, 'response.payment.token_id'),
    sessionId: stringAt(responseBody, 'response.order.session_id'),
    providerAmount,
    currency: config.currency,
    rawResponse: responseBody
  };
}

function valueAt(input: Record<string, unknown>, path: string) {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!isRecord(value)) {
      return undefined;
    }
    return value[key];
  }, input);
}

function stringAt(input: Record<string, unknown>, path: string) {
  const value = valueAt(input, path);
  return typeof value === 'string' && value ? value : null;
}

function findIdentifier(input: Record<string, unknown>) {
  const candidates = [
    valueAt(input, 'virtual_account_payment.identifier'),
    valueAt(input, 'online_to_offline_payment.identifier'),
    valueAt(input, 'card_payment.identifier'),
    valueAt(input, 'direct_debit_payment.identifier'),
    valueAt(input, 'emoney_payment.identifier'),
    valueAt(input, 'qris_payment.identifier')
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const transactionId = candidate.find(
      (item) => isRecord(item) && item.name === 'TRANSACTION_ID' && typeof item.value === 'string'
    );

    if (isRecord(transactionId) && typeof transactionId.value === 'string') {
      return transactionId.value;
    }
  }

  return null;
}

export function mapDokuStatus(status: string): DokuProviderStatus {
  const normalized = status.toUpperCase();

  if (normalized === 'SUCCESS') {
    return 'success';
  }

  if (normalized === 'FAILED' || normalized === 'EXPIRED') {
    return 'failed';
  }

  return 'pending';
}

export function parseDokuNotification(raw: Record<string, unknown>): DokuNotification {
  const invoiceNumber = stringAt(raw, 'order.invoice_number');
  const orderId = invoiceNumber?.match(/^ASP-\d{8}-[A-Z2-9]{8}/)?.[0] ?? invoiceNumber;
  const transactionStatus = stringAt(raw, 'transaction.status') ?? '';

  if (!invoiceNumber || !orderId) {
    throw new Error('DOKU notification is missing order.invoice_number');
  }

  if (!transactionStatus) {
    throw new Error('DOKU notification is missing transaction.status');
  }

  const transactionId =
    findIdentifier(raw) ??
    stringAt(raw, 'transaction.original_request_id') ??
    stringAt(raw, 'transaction.id') ??
    orderId;
  const providerStatus = mapDokuStatus(transactionStatus);
  const message =
    stringAt(raw, 'message') ??
    stringAt(raw, 'transaction.status') ??
    stringAt(raw, 'order.status') ??
    `DOKU transaction ${transactionStatus}`;

  return {
    orderId,
    invoiceNumber,
    providerStatus,
    transactionStatus,
    transactionId: String(transactionId),
    transactionDate: stringAt(raw, 'transaction.date'),
    channelId: stringAt(raw, 'channel.id'),
    serviceId: stringAt(raw, 'service.id'),
    acquirerId: stringAt(raw, 'acquirer.id'),
    message: String(message),
    raw
  };
}
