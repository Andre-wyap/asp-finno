import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth API routes and login page through without a session
  const isPublic =
    pathname === '/login' ||
    pathname.startsWith('/api/auth/');

  if (isPublic) return NextResponse.next();

  const session = request.cookies.get('__session')?.value;

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
