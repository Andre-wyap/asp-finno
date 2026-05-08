import { NextResponse } from 'next/server';
import { authError, verifyAdmin } from '../../../../../lib/auth';
import { getDb } from '../../../../../lib/firebaseAdmin';

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

  const [appDoc, eventsSnap] = await Promise.all([
    db.collection('applications').doc(orderId).get(),
    db
      .collection('applications')
      .doc(orderId)
      .collection('events')
      .orderBy('at', 'desc')
      .limit(100)
      .get()
  ]);

  if (!appDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const events = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ id: appDoc.id, ...appDoc.data(), events });
}
