import { NextResponse } from 'next/server';
import { authError, verifyAdmin } from '../../../../../../../lib/auth';
import { getDb } from '../../../../../../../lib/firebaseAdmin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  const { orderId } = await params;
  const db = getDb();

  const snap = await db
    .collection('applications')
    .doc(orderId)
    .collection('events')
    .where('type', 'in', ['email_sent', 'email_event'])
    .orderBy('at', 'desc')
    .limit(200)
    .get();

  const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ events });
}
