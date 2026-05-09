import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../../../../lib/firebaseAdmin';

// Resend webhook event payload shape (subset we care about)
interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.bounced' | 'email.opened' | 'email.clicked' | 'email.complained';
  data: {
    email_id: string;
    to?: string[];
    subject?: string;
    [key: string]: unknown;
  };
}

type EmailEventKind = 'delivered' | 'bounced' | 'opened' | 'clicked' | 'complaint';

function kindFromType(type: string): EmailEventKind | null {
  const map: Record<string, EmailEventKind> = {
    'email.delivered': 'delivered',
    'email.bounced': 'bounced',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.complained': 'complaint',
  };
  return map[type] ?? null;
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('RESEND_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await request.text();
  const svixId = request.headers.get('svix-id') ?? '';
  const svixTimestamp = request.headers.get('svix-timestamp') ?? '';
  const svixSignature = request.headers.get('svix-signature') ?? '';

  let event: ResendWebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendWebhookEvent;
  } catch (err) {
    console.error('resend_webhook_signature_failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const resendMessageId = event.data.email_id;
  const kind = kindFromType(event.type);

  if (!kind) {
    // email.sent is handled by our own code; ignore it here
    return NextResponse.json({ ok: true });
  }

  try {
    const db = getDb();

    // Find the email_sent event that matches this resendMessageId
    const emailSentQuery = await db
      .collectionGroup('events')
      .where('type', '==', 'email_sent')
      .where('payload.resendMessageId', '==', resendMessageId)
      .limit(1)
      .get();

    if (emailSentQuery.empty) {
      // Message not found — could be from a different send path; just record and return
      console.warn('resend_webhook_no_matching_email_sent', { resendMessageId, kind });
      return NextResponse.json({ ok: true });
    }

    const emailSentDoc = emailSentQuery.docs[0];
    // Derive the application ref from the event's path: applications/{orderId}/events/{eventId}
    const applicationRef = emailSentDoc.ref.parent.parent;
    if (!applicationRef) {
      return NextResponse.json({ ok: true });
    }

    // Idempotency key: (resendMessageId, kind)
    const idempotencyId = `email_event_${resendMessageId}_${kind}`;
    const existingCheck = await applicationRef.collection('events').doc(idempotencyId).get();
    if (existingCheck.exists) {
      return NextResponse.json({ ok: true });
    }

    await applicationRef.collection('events').doc(idempotencyId).set({
      type: 'email_event',
      actor: { kind: 'resend', id: null },
      payload: {
        resendMessageId,
        kind,
        raw: event.data,
      },
      at: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('resend_webhook_processing_error', err);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
