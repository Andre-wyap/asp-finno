import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { adminActivityActor, writeActivityLog } from '../../../../../../../lib/activity';
import { authError, verifyAdmin } from '../../../../../../../lib/auth';
import { getDb } from '../../../../../../../lib/firebaseAdmin';

// Rate limit: 10 per minute, 200 per day per admin (in-memory, resets on cold start)
const rateLimits = new Map<string, { minute: { count: number; reset: number }; day: { count: number; reset: number } }>();

function checkRateLimit(adminUid: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const entry = rateLimits.get(adminUid) ?? {
    minute: { count: 0, reset: now + 60_000 },
    day: { count: 0, reset: now + 86_400_000 },
  };

  if (now > entry.minute.reset) entry.minute = { count: 0, reset: now + 60_000 };
  if (now > entry.day.reset) entry.day = { count: 0, reset: now + 86_400_000 };

  if (entry.minute.count >= 10) return { allowed: false, reason: 'Rate limit: max 10 per minute' };
  if (entry.day.count >= 200) return { allowed: false, reason: 'Rate limit: max 200 per day' };

  entry.minute.count++;
  entry.day.count++;
  rateLimits.set(adminUid, entry);
  return { allowed: true };
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

  const rateCheck = checkRateLimit(admin.uid);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
  }

  const { orderId } = await params;
  const body = (await request.json()) as { subject?: string; body?: string; cc?: string[] };

  if (!body.subject?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: 'subject and body are required' }, { status: 400 });
  }

  const db = getDb();
  const appRef = db.collection('applications').doc(orderId);
  const appDoc = await appRef.get();

  if (!appDoc.exists) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const appData = appDoc.data()!;
  const recipientEmail: string = appData.applicant?.email;
  if (!recipientEmail) {
    return NextResponse.json({ error: 'Application has no email address' }, { status: 422 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_ADDRESS ?? 'Allianz Shield Plus <noreply@finnomalaysia.com>';

  if (!apiKey) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: recipientEmail,
    cc: body.cc?.filter((e) => e !== recipientEmail),
    subject: body.subject.trim(),
    html: body.body.trim(),
  });

  if (error) {
    console.error('custom_email_send_failed', { orderId, error });
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const eventRef = await appRef.collection('events').add({
    type: 'email_sent',
    actor: { kind: 'admin', id: admin.uid },
    payload: {
      template: 'custom',
      resendMessageId: data?.id ?? null,
      to: recipientEmail,
      subject: body.subject.trim(),
      triggeredBy: 'admin_custom',
    },
    at: FieldValue.serverTimestamp(),
  });
  await writeActivityLog(db, {
    actor: adminActivityActor(admin),
    action: 'email_sent',
    orderId,
    summary: 'Custom email sent',
    payload: { eventId: eventRef.id, template: 'custom' }
  });

  return NextResponse.json({ ok: true, messageId: data?.id });
}
