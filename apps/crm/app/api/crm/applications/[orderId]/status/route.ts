import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@asp/shared/status';
import { triggerStatusEmail } from '@asp/shared/onStatusChange';
import { planNameFromCode } from '@asp/pricing';
import { adminActivityActor, writeActivityLog } from '../../../../../../lib/activity';
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

  let body: { to?: string; policyNumber?: string; note?: string; sendEmail?: boolean };
  try {
    body = (await request.json()) as {
      to?: string;
      policyNumber?: string;
      note?: string;
      sendEmail?: boolean;
    };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const to = body.to as ApplicationStatus | undefined;
  if (!to || !APPLICATION_STATUSES.includes(to)) {
    return NextResponse.json({ error: '"to" status is required' }, { status: 400 });
  }

  const db = getDb();
  const appRef = db.collection('applications').doc(orderId);
  const appDoc = await appRef.get();

  if (!appDoc.exists) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const appData = appDoc.data()!;
  const current = appData.status as ApplicationStatus;

  if (current === to) {
    return NextResponse.json({ error: `Application is already "${to}"` }, { status: 422 });
  }

  if (to === 'issued' && !body.policyNumber?.trim()) {
    return NextResponse.json({ error: 'policyNumber is required when issuing' }, { status: 400 });
  }

  const note = body.note?.trim() ?? '';
  const sendEmail = body.sendEmail !== false;
  const now = FieldValue.serverTimestamp();
  const policyNumber = body.policyNumber?.trim();
  const updates: Record<string, unknown> = {
    status: to,
    updatedAt: now,
    ownerAdminId: admin.uid
  };

  if (to === 'issued') {
    updates.policyNumber = policyNumber;
    updates.issuedAt = now;
  }

  if (to === 'paid' && !appData.paidAt) {
    updates.paidAt = now;
  }

  await appRef.update(updates);

  const statusEventRef = await appRef.collection('events').add({
    type: 'status_change',
    from: current,
    to,
    actor: { kind: 'admin', id: admin.uid },
    payload: {
      manual: true,
      note: note || null,
      ...(to === 'issued' && policyNumber ? { policyNumber } : {})
    },
    at: now
  });
  await writeActivityLog(db, {
    actor: adminActivityActor(admin),
    action: 'status_change',
    orderId,
    summary: `${current} -> ${to}`,
    payload: { from: current, to, eventId: statusEventRef.id }
  });

  if (note) {
    const noteEventRef = await appRef.collection('events').add({
      type: 'note',
      actor: { kind: 'admin', id: admin.uid },
      payload: { note, context: `manual_status_change:${current}->${to}` },
      at: now
    });
    await writeActivityLog(db, {
      actor: adminActivityActor(admin),
      action: 'note',
      orderId,
      summary: 'Note added during status change',
      payload: { eventId: noteEventRef.id }
    });
  }

  if (sendEmail && (to === 'paid' || to === 'payment_failed' || to === 'issued')) {
    const eventsCol = appRef.collection('events');
    triggerStatusEmail({
      orderId,
      application: {
        applicantName: appData.applicant?.name ?? '',
        applicantEmail: appData.applicant?.email ?? '',
        planName: planNameFromCode(appData.plan?.code ?? ''),
        planCode: appData.plan?.code ?? '',
        premiumAmount: appData.premium?.amount ?? 0,
        premiumCurrency: appData.premium?.currency ?? 'MYR',
        trackerToken: appData.trackerToken ?? '',
        policyNumber,
        issuedAt: new Date().toLocaleDateString('en-MY', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      },
      from: current,
      to,
      writeEvent: (data) =>
        eventsCol.add({ ...data, at: FieldValue.serverTimestamp() }).then(() => undefined)
    })
      .then((result) => {
        if (!result.ok)
          console.error('triggerStatusEmail_failed', { orderId, to, error: result.error });
      })
      .catch((err: unknown) => console.error('triggerStatusEmail_failed', err));
  }

  return NextResponse.json({ ok: true });
}
