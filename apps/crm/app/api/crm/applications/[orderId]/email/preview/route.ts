import { NextResponse } from 'next/server';
import * as React from 'react';
import { render } from '@react-email/render';
import { authError, verifyAdmin } from '../../../../../../../lib/auth';
import { getDb } from '../../../../../../../lib/firebaseAdmin';
import { LeadReminder } from '@asp/shared/emails/LeadReminder';
import { Paid } from '@asp/shared/emails/Paid';
import { PaymentFailed } from '@asp/shared/emails/PaymentFailed';
import { Issued } from '@asp/shared/emails/Issued';
import type { ApplicationStatus } from '@asp/shared/status';
import { planNameFromCode } from '@asp/pricing';

type TemplateKey = ApplicationStatus | 'lead_reminder';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function trackerUrl(trackerToken: string): string {
  const base = process.env.TRACKER_BASE_URL ?? 'https://asp.finnomalaysia.com';
  return `${base}/track/${trackerToken}`;
}

function retryUrl(trackerToken: string): string {
  const base = process.env.TRACKER_BASE_URL ?? 'https://asp.finnomalaysia.com';
  return `${base}/payment/retry/${trackerToken}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  const { orderId } = await params;
  let body: { template: TemplateKey; overrides?: Record<string, string> };
  try {
    body = (await request.json()) as { template: TemplateKey; overrides?: Record<string, string> };
  } catch {
    return jsonError('Invalid preview request body');
  }
  const { template, overrides = {} } = body;

  if (!template) {
    return jsonError('Template is required');
  }

  const db = getDb();
  const appDoc = await db.collection('applications').doc(orderId).get();
  if (!appDoc.exists) {
    return jsonError('Application not found', 404);
  }

  const appData = appDoc.data()!;
  const trackerToken = appData.trackerToken ?? '';
  const tracker = trackerUrl(trackerToken);
  const retry = retryUrl(trackerToken);

  let element: React.ReactElement;

  switch (template) {
    case 'lead_reminder':
      element = React.createElement(LeadReminder, {
        applicantName: overrides.applicantName ?? appData.applicant?.name ?? '',
        orderId,
        planName: overrides.planName ?? planNameFromCode(appData.plan?.code ?? ''),
        premiumAmount: Number(overrides.premiumAmount ?? appData.premium?.amount ?? 0),
        premiumCurrency: appData.premium?.currency ?? 'MYR',
        paymentUrl: overrides.paymentUrl ?? retry,
        trackerUrl: tracker,
      });
      break;

    case 'paid':
      element = React.createElement(Paid, {
        applicantName: overrides.applicantName ?? appData.applicant?.name ?? '',
        orderId,
        planName: overrides.planName ?? planNameFromCode(appData.plan?.code ?? ''),
        premiumAmount: Number(overrides.premiumAmount ?? appData.premium?.amount ?? 0),
        premiumCurrency: appData.premium?.currency ?? 'MYR',
        paidAt: overrides.paidAt ?? (appData.paidAt?.toDate().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }) ?? new Date().toLocaleDateString()),
        trackerUrl: tracker,
      });
      break;

    case 'payment_failed':
      element = React.createElement(PaymentFailed, {
        applicantName: overrides.applicantName ?? appData.applicant?.name ?? '',
        orderId,
        planName: overrides.planName ?? planNameFromCode(appData.plan?.code ?? ''),
        premiumAmount: Number(overrides.premiumAmount ?? appData.premium?.amount ?? 0),
        premiumCurrency: appData.premium?.currency ?? 'MYR',
        failureMessage: overrides.failureMessage ?? appData.payment?.lastMessage,
        retryUrl: overrides.retryUrl ?? retry,
        trackerUrl: tracker,
      });
      break;

    case 'issued':
      element = React.createElement(Issued, {
        applicantName: overrides.applicantName ?? appData.applicant?.name ?? '',
        orderId,
        planName: overrides.planName ?? planNameFromCode(appData.plan?.code ?? ''),
        policyNumber: overrides.policyNumber ?? appData.policyNumber ?? '(not yet assigned)',
        issuedAt: overrides.issuedAt ?? (appData.issuedAt?.toDate().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }) ?? new Date().toLocaleDateString()),
        trackerUrl: tracker,
      });
      break;

    default:
      return jsonError(`Unknown template: ${template}`);
  }

  try {
    const html = await render(element);
    return NextResponse.json({ html });
  } catch (error) {
    console.error('email_preview_render_failed', { orderId, template, error });
    return jsonError('Unable to render preview. Check the server logs for the template renderer error.', 500);
  }
}
