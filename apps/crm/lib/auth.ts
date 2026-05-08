import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminAuth } from './firebaseAdmin';

export interface AdminUser {
  uid: string;
  email: string | undefined;
}

export async function verifyAdmin(): Promise<AdminUser> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;

  if (!sessionCookie) {
    throw new Error('Unauthenticated');
  }

  const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);

  if (decoded.role !== 'admin') {
    throw new Error('Forbidden: admin role required');
  }

  return { uid: decoded.uid, email: decoded.email };
}

export function authError(message: string, status = 401) {
  return NextResponse.json({ error: message }, { status });
}
