import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { adminActivityActor, writeActivityLog } from '../../../../../lib/activity';
import { authError, verifyAdmin } from '../../../../../lib/auth';
import { getDb } from '../../../../../lib/firebaseAdmin';

const MAX_BATCH = 200;

type SkipReason = 'not_found' | 'not_archived';

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

  if (!Array.isArray(body.orderIds) || body.orderIds.length === 0) {
    return NextResponse.json({ error: 'Select at least one application to restore' }, { status: 400 });
  }

  const orderIds = Array.from(
    new Set(body.orderIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  );

  if (orderIds.length === 0) {
    return NextResponse.json({ error: 'No valid application IDs provided' }, { status: 400 });
  }

  if (orderIds.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `You can restore at most ${MAX_BATCH} applications at a time` },
      { status: 400 }
    );
  }

  const db = getDb();
  const refs = orderIds.map((id) => db.collection('applications').doc(id));
  const docs = await db.getAll(...refs);

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  const restored: string[] = [];
  const skipped: Array<{ orderId: string; reason: SkipReason }> = [];

  for (const doc of docs) {
    if (!doc.exists) {
      skipped.push({ orderId: doc.id, reason: 'not_found' });
      continue;
    }

    const data = doc.data() ?? {};

    if (!data.archivedAt) {
      skipped.push({ orderId: doc.id, reason: 'not_archived' });
      continue;
    }

    const restoredStatus = (data.statusBeforeArchive as string | undefined) ?? (data.status as string) ?? null;

    batch.update(doc.ref, {
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      statusBeforeArchive: null,
      updatedAt: now,
      ownerAdminId: admin.uid
    });

    batch.set(doc.ref.collection('events').doc(), {
      type: 'application_unarchived',
      from: 'archived',
      to: restoredStatus,
      actor: { kind: 'admin', id: admin.uid, email: admin.email ?? null },
      payload: { reason: reason || null, bulk: true },
      at: now
    });

    restored.push(doc.id);
  }

  if (restored.length > 0) {
    await batch.commit();
    await writeActivityLog(db, {
      actor: adminActivityActor(admin),
      action: 'applications_bulk_unarchived',
      orderId: null,
      summary: `Bulk restored ${restored.length} application${restored.length === 1 ? '' : 's'}`,
      payload: { restoredOrderIds: restored, restoredCount: restored.length, skippedCount: skipped.length }
    });
  }

  return NextResponse.json({
    ok: true,
    restoredCount: restored.length,
    restored,
    skippedCount: skipped.length,
    skipped
  });
}
