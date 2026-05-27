import crypto from 'node:crypto';

const DEFAULT_GRAPH_VERSION = 'v25.0';
const DEFAULT_TIMEOUT_MS = 2500;

type MetaEventName = 'InitiateCheckout' | 'Purchase';

export type MetaBrowserSignals = {
  fbp?: string;
  fbc?: string;
  userAgent?: string;
  eventSourceUrl?: string;
};

type SendMetaEventInput = {
  eventName: MetaEventName;
  eventId: string;
  eventSourceUrl: string;
  email?: string | null;
  phone?: string | null;
  browserSignals?: MetaBrowserSignals | null;
  customData?: Record<string, unknown>;
};

function firstHeader(headers: Headers, names: string[]) {
  for (const name of names) {
    const value = headers.get(name);

    if (value) {
      return value;
    }
  }

  return null;
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const prefix = `${name}=`;
  const cookie = cookies.find((part) => part.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

function normalizePhone(phone?: string | null) {
  return phone?.replace(/\D/g, '') || null;
}

function graphVersion() {
  const value = process.env.META_CAPI_GRAPH_VERSION?.trim();

  return value || DEFAULT_GRAPH_VERSION;
}

function requestTimeoutMs() {
  const value = Number(process.env.META_CAPI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

export function getMetaBrowserSignals(request: Request, fallbackSourceUrl: string): MetaBrowserSignals {
  const cookieHeader = request.headers.get('cookie');
  const userAgent = request.headers.get('user-agent') ?? undefined;
  const eventSourceUrl =
    firstHeader(request.headers, ['referer', 'referrer', 'origin']) ?? fallbackSourceUrl;

  return {
    ...(cookieValue(cookieHeader, '_fbp') ? { fbp: cookieValue(cookieHeader, '_fbp') } : {}),
    ...(cookieValue(cookieHeader, '_fbc') ? { fbc: cookieValue(cookieHeader, '_fbc') } : {}),
    ...(userAgent ? { userAgent } : {}),
    eventSourceUrl
  };
}

export async function sendMetaCapiEvent({
  eventName,
  eventId,
  eventSourceUrl,
  email,
  phone,
  browserSignals,
  customData
}: SendMetaEventInput) {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();

  if (!pixelId || !accessToken) {
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const userData = {
    ...(normalizedEmail ? { em: [sha256(normalizedEmail)] } : {}),
    ...(normalizedPhone ? { ph: [sha256(normalizedPhone)] } : {}),
    ...(browserSignals?.fbp ? { fbp: browserSignals.fbp } : {}),
    ...(browserSignals?.fbc ? { fbc: browserSignals.fbc } : {}),
    ...(browserSignals?.userAgent ? { client_user_agent: browserSignals.userAgent } : {})
  };
  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: eventSourceUrl,
        action_source: 'website',
        user_data: userData,
        ...(customData ? { custom_data: customData } : {})
      }
    ],
    ...(process.env.META_CAPI_TEST_EVENT_CODE?.trim()
      ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE.trim() }
      : {})
  };

  try {
    const url = new URL(`https://graph.facebook.com/${graphVersion()}/${pixelId}/events`);
    url.searchParams.set('access_token', accessToken);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs());

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        console.error('meta_capi_event_failed', {
          eventName,
          eventId,
          status: response.status,
          response: responseBody
        });
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('meta_capi_event_failed', { eventName, eventId, error });
  }
}
