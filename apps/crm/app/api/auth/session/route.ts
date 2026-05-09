import { NextResponse } from 'next/server';

const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export async function POST(request: Request) {
  try {
    let idToken: string;
    try {
      const body = (await request.json()) as { idToken?: string };
      idToken = body.idToken ?? '';
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!idToken) {
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
    }

    // Lazy import so any module-load failure surfaces here instead of crashing the route.
    const { getAdminAuth } = await import('../../../../lib/firebaseAdmin');

    try {
      const decoded = await getAdminAuth().verifyIdToken(idToken);

      if (decoded.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 });
      }

      const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
        expiresIn: SESSION_DURATION_MS
      });

      const response = NextResponse.json({ ok: true });
      response.cookies.set('__session', sessionCookie, {
        maxAge: SESSION_DURATION_MS / 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });

      return response;
    } catch (err) {
      console.error('session_create_failed', err);
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      return NextResponse.json(
        { error: 'Failed to create session', detail: message, stack },
        { status: 401 }
      );
    }
  } catch (outer) {
    const message = outer instanceof Error ? outer.message : String(outer);
    const stack = outer instanceof Error ? outer.stack : undefined;
    console.error('session_outer_failure', outer);
    return NextResponse.json(
      { error: 'Outer failure', detail: message, stack },
      { status: 500 }
    );
  }
}
