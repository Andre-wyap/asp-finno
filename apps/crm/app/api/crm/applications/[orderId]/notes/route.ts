import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { authError, verifyAdmin } from '../../../../../../lib/auth';
import { getDb } from '../../../../../../lib/firebaseAdmin';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  let admin;
  try {
    admin = await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  const { orderId } = await params;

  let body: { note?: string };
  try {
    body = (await request.json()) as { note?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const note = body.note?.trim();
  if (!note) {
    return NextResponse.json({ error: 'note text is required' }, { status: 400 });
  }

  const db = getDb();
  const appRef = db.collection('applications').doc(orderId);
  const appDoc = await appRef.get();

  if (!appDoc.exists) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const eventRef = await appRef.collection('events').add({
    type: 'note',
    from: null,
    to: null,
    actor: { kind: 'admin', id: admin.uid },
    payload: { note },
    at: FieldValue.serverTimestamp()
  });

  await appRef.update({ updatedAt: FieldValue.serverTimestamp() });

  return NextResponse.json({ ok: true, eventId: eventRef.id });
}
