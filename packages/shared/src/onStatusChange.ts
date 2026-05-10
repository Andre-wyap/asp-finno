import * as React from 'react';
import { sendEmail } from './email';
import type { ApplicationStatus } from './status';
import { LeadReminder } from '../emails/LeadReminder';
import { Paid } from '../emails/Paid';
import { PaymentFailed } from '../emails/PaymentFailed';
import { Issued } from '../emails/Issued';

export interface ApplicationSnapshot {
  applicantName: string;
  applicantEmail: string;
  planName: string;
  planCode: string;
  premiumAmount: number;
  premiumCurrency: string;
  trackerToken: string;
  policyNumber?: string;
  paidAt?: string;
  issuedAt?: string;
  failureMessage?: string;
}

export interface StatusEmailParams {
  orderId: string;
  application: ApplicationSnapshot;
  from: ApplicationStatus | null;
  to: ApplicationStatus;
  writeEvent: (data: Record<string, unknown>) => Promise<void>;
}

function trackerUrl(trackerToken: string): string {
  const base = process.env.TRACKER_BASE_URL ?? 'https://asp.finnomalaysia.com';
  return `${base}/track/${trackerToken}`;
}

function paymentUrl(trackerToken: string): string {
  const base = process.env.TRACKER_BASE_URL ?? 'https://asp.finnomalaysia.com';
  return `${base}/payment/retry/${trackerToken}`;
}

export async function triggerStatusEmail({
  orderId,
  application,
  to,
  writeEvent,
}: StatusEmailParams): Promise<void> {
  const tracker = trackerUrl(application.trackerToken);

  let subject: string;
  let template: React.ReactElement;

  switch (to) {
    case 'paid':
      subject = `Payment confirmed — ${application.planName} (${orderId})`;
      template = React.createElement(Paid, {
        applicantName: application.applicantName,
        orderId,
        planName: application.planName,
        premiumAmount: application.premiumAmount,
        premiumCurrency: application.premiumCurrency,
        paidAt: application.paidAt ?? new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }),
        trackerUrl: tracker,
      });
      break;

    case 'payment_failed':
      subject = `Payment unsuccessful — retry your application (${orderId})`;
      template = React.createElement(PaymentFailed, {
        applicantName: application.applicantName,
        orderId,
        planName: application.planName,
        premiumAmount: application.premiumAmount,
        premiumCurrency: application.premiumCurrency,
        failureMessage: application.failureMessage,
        retryUrl: paymentUrl(application.trackerToken),
        trackerUrl: tracker,
      });
      break;

    case 'issued':
      if (!application.policyNumber) return;
      subject = `Your policy has been issued — ${application.policyNumber}`;
      template = React.createElement(Issued, {
        applicantName: application.applicantName,
        orderId,
        planName: application.planName,
        policyNumber: application.policyNumber,
        issuedAt: application.issuedAt ?? new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }),
        trackerUrl: tracker,
      });
      break;

    default:
      return;
  }

  try {
    const result = await sendEmail({
      to: application.applicantEmail,
      subject,
      template,
    });

    if (result.error) {
      await writeEvent({
        type: 'email_send_failed',
        actor: { kind: 'system', id: null },
        payload: {
          template: to,
          to: application.applicantEmail,
          subject,
          error: result.error,
        },
      });
      console.error('email_send_failed', { orderId, to, error: result.error });
      return;
    }

    await writeEvent({
      type: 'email_sent',
      actor: { kind: 'system', id: null },
      payload: {
        template: to,
        resendMessageId: result.messageId,
        to: application.applicantEmail,
        subject,
        triggeredBy: 'status_change',
      },
    });
  } catch (err) {
    console.error('email_exception', { orderId, to, err });
    await writeEvent({
      type: 'email_send_failed',
      actor: { kind: 'system', id: null },
      payload: {
        template: to,
        to: application.applicantEmail,
        subject,
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

export async function triggerLeadReminderEmail(params: {
  orderId: string;
  application: ApplicationSnapshot;
  writeEvent: (data: Record<string, unknown>) => Promise<void>;
}): Promise<void> {
  const { orderId, application, writeEvent } = params;
  const tracker = trackerUrl(application.trackerToken);
  const payment = paymentUrl(application.trackerToken);

  const subject = `Complete your application — ${application.planName} is waiting (${orderId})`;
  const template = React.createElement(LeadReminder, {
    applicantName: application.applicantName,
    orderId,
    planName: application.planName,
    premiumAmount: application.premiumAmount,
    premiumCurrency: application.premiumCurrency,
    paymentUrl: payment,
    trackerUrl: tracker,
  });

  try {
    const result = await sendEmail({
      to: application.applicantEmail,
      subject,
      template,
    });

    if (result.error) {
      await writeEvent({
        type: 'email_send_failed',
        actor: { kind: 'system', id: 'lead-reminder-cron' },
        payload: { template: 'lead_reminder', to: application.applicantEmail, subject, error: result.error },
      });
      console.error('lead_reminder_send_failed', { orderId, error: result.error });
      return;
    }

    await writeEvent({
      type: 'email_sent',
      actor: { kind: 'system', id: 'lead-reminder-cron' },
      payload: {
        template: 'lead_reminder',
        resendMessageId: result.messageId,
        to: application.applicantEmail,
        subject,
        triggeredBy: 'lead_reminder_cron',
      },
    });
  } catch (err) {
    console.error('lead_reminder_exception', { orderId, err });
  }
}
