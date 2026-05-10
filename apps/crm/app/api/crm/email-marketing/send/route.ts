import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { adminActivityActor, writeActivityLog } from '../../../../../lib/activity';
import { authError, verifyAdmin } from '../../../../../lib/auth';
import { getDb } from '../../../../../lib/firebaseAdmin';
import { buildRecipientQuery, type MarketingFilters } from '../../../../../lib/marketing';

export const maxDuration = 300;

const campaignRateLimit = new Map<string, number>();
const MIN_INTERVAL_MS = 30_000;
const MAX_RECIPIENTS_PER_CAMPAIGN = 500;

function renderBody(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&'
      ? '&amp;'
      : c === '<'
        ? '&lt;'
        : c === '>'
          ? '&gt;'
          : c === '"'
            ? '&quot;'
            : '&#39;'
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request: Request) {
  let admin;
  try {
    admin = await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  const last = campaignRateLimit.get(admin.uid) ?? 0;
  const now = Date.now();
  if (now - last < MIN_INTERVAL_MS) {
    const wait = Math.ceil((MIN_INTERVAL_MS - (now - last)) / 1000);
    return NextResponse.json(
      { error: `Wait ${wait}s before sending another campaign.` },
      { status: 429 }
    );
  }

  let body: {
    filters?: MarketingFilters;
    subject?: string;
    htmlBody?: string;
    campaignName?: string;
    confirmCount?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const subject = body.subject?.trim();
  const htmlBody = body.htmlBody?.trim();
  const campaignName = body.campaignName?.trim() || `campaign-${new Date().toISOString()}`;

  if (!subject || !htmlBody) {
    return NextResponse.json({ error: 'subject and htmlBody are required' }, { status: 400 });
  }
  if (!body.filters) {
    return NextResponse.json({ error: 'filters are required' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_ADDRESS ?? 'Allianz Shield Plus <noreply@finnomalaysia.com>';
  if (!apiKey) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
  }

  const db = getDb();
  const docs = await buildRecipientQuery(db, body.filters);

  const recipients = docs
    .map((d) => {
      const data = d.data();
      return {
        orderId: d.id,
        name: (data.applicant?.name ?? '') as string,
        email: (data.applicant?.email ?? '') as string,
        marketingUnsubscribed: Boolean(data.marketingUnsubscribed)
      };
    })
    .filter((r) => r.email && !r.marketingUnsubscribed);

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipients match these filters.' }, { status: 422 });
  }
  if (recipients.length > MAX_RECIPIENTS_PER_CAMPAIGN) {
    return NextResponse.json(
      {
        error: `Campaign capped at ${MAX_RECIPIENTS_PER_CAMPAIGN} recipients per send (current: ${recipients.length}). Tighten filters.`
      },
      { status: 422 }
    );
  }
  if (typeof body.confirmCount !== 'number' || body.confirmCount !== recipients.length) {
    return NextResponse.json(
      {
        error: `Recipient count mismatch. Expected ${recipients.length}, received ${body.confirmCount ?? 'none'}. Re-preview before sending.`
      },
      { status: 409 }
    );
  }

  campaignRateLimit.set(admin.uid, now);

  const campaignId = `mkt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const campaignRef = db.collection('marketingCampaigns').doc(campaignId);
  await campaignRef.set({
    campaignName,
    subject,
    htmlBody,
    filters: body.filters,
    recipientCount: recipients.length,
    createdBy: admin.uid,
    createdAt: FieldValue.serverTimestamp(),
    status: 'sending'
  });

  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;
  const failures: { orderId: string; email: string; error: string }[] = [];

  for (const r of recipients) {
    const personalised = renderBody(htmlBody, {
      name: escapeHtml(r.name),
      orderId: r.orderId
    });
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: r.email,
        subject: renderBody(subject, { name: r.name, orderId: r.orderId }),
        html: personalised
      });

      if (error) {
        failed++;
        failures.push({ orderId: r.orderId, email: r.email, error: error.message });
        await db
          .collection('applications')
          .doc(r.orderId)
          .collection('events')
          .add({
            type: 'marketing_email_failed',
            actor: { kind: 'admin', id: admin.uid },
            payload: { campaignId, campaignName, subject, error: error.message },
            at: FieldValue.serverTimestamp()
          });
      } else {
        sent++;
        await db
          .collection('applications')
          .doc(r.orderId)
          .collection('events')
          .add({
            type: 'marketing_email_sent',
            actor: { kind: 'admin', id: admin.uid },
            payload: {
              campaignId,
              campaignName,
              subject,
              resendMessageId: data?.id ?? null,
              triggeredBy: 'admin_marketing'
            },
            at: FieldValue.serverTimestamp()
          });
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ orderId: r.orderId, email: r.email, error: message });
    }

    // throttle to ~5/s to stay well below Resend's 10/s default
    await sleep(200);
  }

  await campaignRef.update({
    status: 'completed',
    sent,
    failed,
    completedAt: FieldValue.serverTimestamp(),
    failures: failures.slice(0, 50)
  });
  await writeActivityLog(db, {
    actor: adminActivityActor(admin),
    action: sent > 0 ? 'marketing_email_sent' : 'marketing_email_failed',
    orderId: null,
    summary: `Marketing campaign "${campaignName}" completed: ${sent} sent, ${failed} failed`,
    payload: { campaignId, sent, failed, total: recipients.length }
  });

  return NextResponse.json({ ok: true, campaignId, sent, failed, total: recipients.length });
}
