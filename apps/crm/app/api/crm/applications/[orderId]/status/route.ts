import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { canTransitionStatus, type ApplicationStatus } from '@asp/shared';
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

  let body: { to?: string; policyNumber?: string };
  try {
    body = (await request.json()) as { to?: string; policyNumber?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const to = body.to as ApplicationStatus | undefined;
  if (!to) {
    return NextResponse.json({ error: '"to" status is required' }, { status: 400 });
  }

  const db = getDb();
  const appRef = db.collection('applications').doc(orderId);
  const appDoc = await appRef.get();

  if (!appDoc.exists) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const current = appDoc.data()?.status as ApplicationStatus;

  if (!canTransitionStatus(current, to)) {
    return NextResponse.json(
      { error: `Cannot transition from "${current}" to "${to}"` },
      { status: 422 }
    );
  }

  if (to === 'issued' && !body.policyNumber?.trim()) {
    return NextResponse.json({ error: 'policyNumber is required when issuing' }, { status: 400 });
  }

  const now = FieldValue.serverTimestamp();
  const updates: Record<string, unknown> = {
    status: to,
    updatedAt: now,
    ownerAdminId: admin.uid
  };

  if (to === 'issued') {
    updates.policyNumber = body.policyNumber!.trim();
    updates.issuedAt = now;
  }

  await appRef.update(updates);

  await appRef.collection('events').add({
    type: 'status_change',
    from: current,
    to,
    actor: { kind: 'admin', id: admin.uid },
    payload: to === 'issued' ? { policyNumber: body.policyNumber!.trim() } : {},
    at: now
  });

  return NextResponse.json({ ok: true });
}
