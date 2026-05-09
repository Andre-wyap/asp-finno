import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { authError, verifyAdmin } from '../../../../../../../lib/auth';
import { getDb } from '../../../../../../../lib/firebaseAdmin';
import { triggerStatusEmail, triggerLeadReminderEmail } from '@asp/shared/onStatusChange';
import type { ApplicationStatus } from '@asp/shared';

type TemplateKey = ApplicationStatus | 'lead_reminder';

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
  const body = (await request.json()) as { template: TemplateKey };
  const { template } = body;

  const db = getDb();
  const appRef = db.collection('applications').doc(orderId);
  const appDoc = await appRef.get();

  if (!appDoc.exists) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const appData = appDoc.data()!;
  const eventsCol = appRef.collection('events');

  const writeEvent = (data: Record<string, unknown>) =>
    eventsCol.add({ ...data, at: FieldValue.serverTimestamp(), actor: { kind: 'admin', id: admin.uid } }).then(() => undefined);

  // Guard: lead_reminder only makes sense if still a lead
  if (template === 'lead_reminder' && appData.status !== 'lead') {
    return NextResponse.json(
      { error: 'lead_reminder can only be resent when status is "lead"' },
      { status: 422 }
    );
  }

  const application = {
    applicantName: appData.applicant?.name ?? '',
    applicantEmail: appData.applicant?.email ?? '',
    planName: appData.plan?.code ?? '',
    planCode: appData.plan?.code ?? '',
    premiumAmount: appData.premium?.amount ?? 0,
    premiumCurrency: appData.premium?.currency ?? 'MYR',
    trackerToken: appData.trackerToken ?? '',
    policyNumber: appData.policyNumber ?? undefined,
    paidAt: appData.paidAt?.toDate().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }) ?? undefined,
    issuedAt: appData.issuedAt?.toDate().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }) ?? undefined,
  };

  if (template === 'lead_reminder') {
    await triggerLeadReminderEmail({ orderId, application, writeEvent });
  } else {
    await triggerStatusEmail({
      orderId,
      application,
      from: null,
      to: template as ApplicationStatus,
      writeEvent,
    });
  }

  return NextResponse.json({ ok: true });
}
