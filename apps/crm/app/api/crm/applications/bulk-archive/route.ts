import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { adminActivityActor, writeActivityLog } from '../../../../../lib/activity';
import { authError, verifyAdmin } from '../../../../../lib/auth';
import { getDb } from '../../../../../lib/firebaseAdmin';

const ARCHIVABLE_STATUSES = new Set(['applied', 'lead', 'payment_failed', 'drop']);
const MAX_BATCH = 200;

type SkipReason = 'not_found' | 'already_archived' | 'not_archivable';

export async function POST(request: Request) {
  let admin;
  try {
    admin = await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  let body: { orderIds?: unknown; reason?: unknown };
  try {
    body = (await request.json()) as { orderIds?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) {
    return NextResponse.json({ error: 'Archive reason is required' }, { status: 400 });
  }

  if (!Array.isArray(body.orderIds) || body.orderIds.length === 0) {
    return NextResponse.json({ error: 'Select at least one application to archive' }, { status: 400 });
  }

  // De-duplicate and keep only well-formed string IDs.
  const orderIds = Array.from(
    new Set(body.orderIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  );

  if (orderIds.length === 0) {
    return NextResponse.json({ error: 'No valid application IDs provided' }, { status: 400 });
  }

  if (orderIds.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `You can archive at most ${MAX_BATCH} applications at a time` },
      { status: 400 }
    );
  }

  const db = getDb();
  const refs = orderIds.map((id) => db.collection('applications').doc(id));
  const docs = await db.getAll(...refs);

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  const archived: string[] = [];
  const skipped: Array<{ orderId: string; reason: SkipReason }> = [];

  for (const doc of docs) {
    if (!doc.exists) {
      skipped.push({ orderId: doc.id, reason: 'not_found' });
      continue;
    }

    const data = doc.data() ?? {};
    const status = (data.status as string) ?? '';

    if (data.archivedAt) {
      skipped.push({ orderId: doc.id, reason: 'already_archived' });
      continue;
    }

    if (!ARCHIVABLE_STATUSES.has(status)) {
      skipped.push({ orderId: doc.id, reason: 'not_archivable' });
      continue;
    }

    batch.update(doc.ref, {
      archivedAt: now,
      archivedBy: { id: admin.uid, email: admin.email ?? null },
      archiveReason: reason,
      statusBeforeArchive: status,
      updatedAt: now,
      ownerAdminId: admin.uid
    });

    batch.set(doc.ref.collection('events').doc(), {
      type: 'application_archived',
      from: status,
      to: 'archived',
      actor: { kind: 'admin', id: admin.uid, email: admin.email ?? null },
      payload: { reason, bulk: true },
      at: now
    });

    archived.push(doc.id);
  }

  if (archived.length > 0) {
    await batch.commit();
    await writeActivityLog(db, {
      actor: adminActivityActor(admin),
      action: 'applications_bulk_archived',
      orderId: null,
      summary: `Bulk archived ${archived.length} application${archived.length === 1 ? '' : 's'}`,
      payload: { archivedOrderIds: archived, archivedCount: archived.length, skippedCount: skipped.length }
    });
  }

  return NextResponse.json({
    ok: true,
    archivedCount: archived.length,
    archived,
    skippedCount: skipped.length,
    skipped
  });
}
