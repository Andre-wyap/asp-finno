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

  let body: { reason?: string };
  try {
    body = (await request.json().catch(() => ({}))) as { reason?: string };
  } catch {
    body = {};
  }

  const { orderId } = await params;
  const db = getDb();
  const appRef = db.collection('applications').doc(orderId);
  const appDoc = await appRef.get();

  if (!appDoc.exists) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const appData = appDoc.data() ?? {};
  if (!appData.archivedAt) {
    return NextResponse.json({ error: 'Application is not archived' }, { status: 422 });
  }

  const now = FieldValue.serverTimestamp();
  const restoredStatus = (appData.statusBeforeArchive as string | undefined) ?? appData.status ?? null;

  await appRef.update({
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    statusBeforeArchive: null,
    updatedAt: now,
    ownerAdminId: admin.uid
  });

  const eventRef = await appRef.collection('events').add({
    type: 'application_unarchived',
    from: 'archived',
    to: restoredStatus,
    actor: { kind: 'admin', id: admin.uid, email: admin.email ?? null },
    payload: { reason: body.reason?.trim() || null },
    at: now
  });

  return NextResponse.json({ ok: true, eventId: eventRef.id });
}
