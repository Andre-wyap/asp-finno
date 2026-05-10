import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { adminActivityActor, writeActivityLog } from '../../../../../../lib/activity';
import { authError, verifyAdmin } from '../../../../../../lib/auth';
import { getDb } from '../../../../../../lib/firebaseAdmin';

const ARCHIVABLE_STATUSES = new Set(['applied', 'lead', 'payment_failed', 'drop']);

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
    body = (await request.json()) as { reason?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const reason = body.reason?.trim();
  if (!reason) {
    return NextResponse.json({ error: 'Archive reason is required' }, { status: 400 });
  }

  const { orderId } = await params;
  const db = getDb();
  const appRef = db.collection('applications').doc(orderId);
  const appDoc = await appRef.get();

  if (!appDoc.exists) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const appData = appDoc.data() ?? {};
  const status = (appData.status as string) ?? '';

  if (appData.archivedAt) {
    return NextResponse.json({ error: 'Application is already archived' }, { status: 422 });
  }

  if (!ARCHIVABLE_STATUSES.has(status)) {
    return NextResponse.json(
      { error: 'Only applied, payment failed, or dropped leads can be archived' },
      { status: 422 }
    );
  }

  const now = FieldValue.serverTimestamp();
  await appRef.update({
    archivedAt: now,
    archivedBy: { id: admin.uid, email: admin.email ?? null },
    archiveReason: reason,
    statusBeforeArchive: status,
    updatedAt: now,
    ownerAdminId: admin.uid
  });

  const eventRef = await appRef.collection('events').add({
    type: 'application_archived',
    from: status,
    to: 'archived',
    actor: { kind: 'admin', id: admin.uid, email: admin.email ?? null },
    payload: { reason },
    at: now
  });
  await writeActivityLog(db, {
    actor: adminActivityActor(admin),
    action: 'application_archived',
    orderId,
    summary: 'Application archived',
    payload: { eventId: eventRef.id, statusBeforeArchive: status }
  });

  return NextResponse.json({ ok: true, eventId: eventRef.id });
}
