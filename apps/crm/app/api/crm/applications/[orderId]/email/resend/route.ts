import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { authError, verifyAdmin } from '../../../../../../../lib/auth';
import { getDb } from '../../../../../../../lib/firebaseAdmin';
import { triggerStatusEmail, triggerLeadReminderEmail } from '@asp/shared/onStatusChange';
import type { ApplicationStatus } from '@asp/shared/status';
import { planNameFromCode } from '@asp/pricing';

type TemplateKey = ApplicationStatus | 'lead_reminder';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

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
  let body: { template: TemplateKey };
  try {
    body = (await request.json()) as { template: TemplateKey };
  } catch {
    return jsonError('Invalid resend request body');
  }
  const { template } = body;

  if (!template) {
    return jsonError('Template is required');
  }

  const db = getDb();
  const appRef = db.collection('applications').doc(orderId);
  const appDoc = await appRef.get();

  if (!appDoc.exists) {
    return jsonError('Application not found', 404);
  }

  const appData = appDoc.data()!;
  const eventsCol = appRef.collection('events');

  const writeEvent = (data: Record<string, unknown>) =>
    eventsCol.add({ ...data, at: FieldValue.serverTimestamp(), actor: { kind: 'admin', id: admin.uid } }).then(() => undefined);

  // Guard: lead_reminder only makes sense before payment is complete
  if (template === 'lead_reminder' && appData.status !== 'applied' && appData.status !== 'lead') {
    return jsonError('lead_reminder can only be resent when status is "applied"', 422);
  }

  const application = {
    applicantName: appData.applicant?.name ?? '',
    applicantEmail: appData.applicant?.email ?? '',
    planName: planNameFromCode(appData.plan?.code ?? ''),
    planCode: appData.plan?.code ?? '',
    premiumAmount: appData.premium?.amount ?? 0,
    premiumCurrency: appData.premium?.currency ?? 'MYR',
    trackerToken: appData.trackerToken ?? '',
    policyNumber: appData.policyNumber ?? undefined,
    paidAt: appData.paidAt?.toDate().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }) ?? undefined,
    issuedAt: appData.issuedAt?.toDate().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }) ?? undefined,
  };

  if (template === 'lead_reminder') {
    const result = await triggerLeadReminderEmail({ orderId, application, writeEvent });
    if (!result.ok) {
      return jsonError(result.error ?? 'Unable to send template.', 502);
    }
  } else {
    const result = await triggerStatusEmail({
      orderId,
      application,
      from: null,
      to: template as ApplicationStatus,
      writeEvent,
    });
    if (!result.ok) {
      return jsonError(result.error ?? 'Unable to send template.', 502);
    }
  }

  return NextResponse.json({ ok: true });
}
