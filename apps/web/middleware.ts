import { NextRequest, NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const hits = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown';
}

export function middleware(request: NextRequest) {
  const ip = getClientIp(request);
  const now = Date.now();
  const current = hits.get(ip);

  if (!current || current.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  current.count += 1;

  if (current.count > MAX_REQUESTS) {
    return new NextResponse('Too many tracker requests. Please try again shortly.', {
      status: 429,
      headers: {
        'retry-after': String(Math.ceil((current.resetAt - now) / 1000))
      }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/track/:path*']
};
