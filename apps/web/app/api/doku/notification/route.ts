import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { planNameFromCode } from '@asp/pricing';
import { triggerStatusEmail } from '@asp/shared/onStatusChange';
import type { ApplicationStatus } from '@asp/shared/status';
import { getDb } from '../../../../lib/firebaseAdmin';
import {
  generateDokuDigest,
  getDokuConfig,
  parseDokuNotification,
  verifyDokuSignature,
  type DokuNotification
} from '../../../../lib/doku';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function ok() {
  return NextResponse.json({ ok: true });
}

function header(request: Request, name: string) {
  return request.headers.get(name) ?? request.headers.get(name.toLowerCase()) ?? '';
}

function eventIdFor(notification: DokuNotification) {
  const raw = `${notification.transactionId}_${notification.transactionStatus}_${notification.invoiceNumber}`;
  return `payment_callback_doku_${raw.replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

function nextStatusFor(providerStatus: DokuNotification['providerStatus']) {
  if (providerStatus === 'success') return 'paid';
  if (providerStatus === 'failed') return 'payment_failed';
  return null;
}

function transactionDate(notification: DokuNotification) {
  const value = notification.transactionDate;

  if (typeof value !== 'string') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

async function handleNotification(request: Request) {
  const rawBody = await request.text();
  const clientId = header(request, 'Client-Id');
  const requestId = header(request, 'Request-Id');
  const requestTimestamp = header(request, 'Request-Timestamp');
  const signature = header(request, 'Signature');
  const requestTarget = new URL(request.url).pathname;
  const { secretKey } = getDokuConfig();
  const digest = generateDokuDigest(rawBody);
  const signatureValid = verifyDokuSignature({
    clientId,
    requestId,
    timestamp: requestTimestamp,
    requestTarget,
    digest,
    signature,
    secretKey
  });

  if (!signatureValid) {
    return jsonError('Invalid DOKU signature', 401);
  }

  let notification: DokuNotification;

  try {
    notification = parseDokuNotification(JSON.parse(rawBody) as Record<string, unknown>);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid DOKU notification payload';
    return jsonError(message);
  }

  const db = getDb();
  const applicationRef = db.collection('applications').doc(notification.orderId);
  const eventRef = applicationRef.collection('events').doc(eventIdFor(notification));
  const nextStatus = nextStatusFor(notification.providerStatus);
  const paidDate = transactionDate(notification);
  const paidAtValue = paidDate ?? FieldValue.serverTimestamp();

  let applicationData: FirebaseFirestore.DocumentData | undefined;
  let statusChanged = false;

  await db.runTransaction(async (transaction) => {
    const [applicationSnapshot, eventSnapshot] = await Promise.all([
      transaction.get(applicationRef),
      transaction.get(eventRef)
    ]);

    if (!applicationSnapshot.exists) {
      throw new Error(`Application not found: ${notification.orderId}`);
    }

    if (eventSnapshot.exists) {
      return;
    }

    applicationData = applicationSnapshot.data();
    const currentStatus = applicationSnapshot.get('status') as string | undefined;
    const statusPatch =
      nextStatus && currentStatus !== nextStatus
        ? {
            status: nextStatus,
            ...(nextStatus === 'paid' ? { paidAt: paidAtValue } : {})
          }
        : {};

    statusChanged = !!(nextStatus && currentStatus !== nextStatus);

    transaction.update(applicationRef, {
      ...statusPatch,
      payment: {
        ...(applicationSnapshot.get('payment') ?? {}),
        provider: 'doku',
        status: notification.providerStatus,
        transactionStatus: notification.transactionStatus,
        providerInvoiceNumber: notification.invoiceNumber,
        transactionId: notification.transactionId,
        lastMessage: notification.message,
        channelId: notification.channelId,
        serviceId: notification.serviceId,
        acquirerId: notification.acquirerId,
        notificationRequestId: requestId,
        signatureVerifiedAt: FieldValue.serverTimestamp()
      },
      updatedAt: FieldValue.serverTimestamp()
    });

    transaction.set(eventRef, {
      type: 'payment_callback',
      from: currentStatus ?? null,
      to: nextStatus ?? currentStatus ?? null,
      actor: { kind: 'system', id: 'doku' },
      payload: {
        provider: 'doku',
        providerStatus: notification.providerStatus,
        transactionStatus: notification.transactionStatus,
        orderId: notification.orderId,
        invoiceNumber: notification.invoiceNumber,
        transactionId: notification.transactionId,
        notificationRequestId: requestId,
        channelId: notification.channelId,
        serviceId: notification.serviceId,
        acquirerId: notification.acquirerId,
        message: notification.message
      },
      at: FieldValue.serverTimestamp()
    });

    if (statusChanged) {
      transaction.set(applicationRef.collection('events').doc(), {
        type: 'status_change',
        from: currentStatus ?? null,
        to: nextStatus,
        actor: { kind: 'system', id: 'doku' },
        payload: {
          provider: 'doku',
          transactionId: notification.transactionId,
          transactionStatus: notification.transactionStatus
        },
        at: FieldValue.serverTimestamp()
      });
    }
  });

  if (statusChanged && nextStatus === 'paid' && applicationData?.promo?.code) {
    const promoCode = applicationData.promo.code as string;
    db.collection('promoCodes')
      .doc(promoCode)
      .update({ usageCount: FieldValue.increment(1) })
      .catch((err: unknown) => console.error('promo_usage_increment_failed', { promoCode, err }));
  }

  if (statusChanged && nextStatus && applicationData) {
    const eventsCol = applicationRef.collection('events');
    try {
      const result = await triggerStatusEmail({
        orderId: notification.orderId,
        application: {
          applicantName: applicationData.applicant?.name ?? '',
          applicantEmail: applicationData.applicant?.email ?? '',
          planName: planNameFromCode(applicationData.plan?.code ?? ''),
          planCode: applicationData.plan?.code ?? '',
          premiumAmount: applicationData.premium?.amount ?? 0,
          premiumCurrency: applicationData.premium?.currency ?? 'MYR',
          trackerToken: applicationData.trackerToken ?? '',
          failureMessage: notification.providerStatus === 'failed' ? notification.message : undefined,
          paidAt:
            nextStatus === 'paid'
              ? new Date().toLocaleDateString('en-MY', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              : undefined
        },
        from: (applicationData.status as ApplicationStatus) ?? null,
        to: nextStatus as ApplicationStatus,
        writeEvent: (data) =>
          eventsCol.add({ ...data, at: FieldValue.serverTimestamp() }).then(() => undefined)
      });

      if (!result.ok) {
        console.error('triggerStatusEmail_failed', {
          orderId: notification.orderId,
          to: nextStatus,
          error: result.error
        });
      }
    } catch (err) {
      console.error('triggerStatusEmail_failed', {
        orderId: notification.orderId,
        to: nextStatus,
        err
      });
    }
  }

  return ok();
}

export async function POST(request: Request) {
  try {
    return await handleNotification(request);
  } catch (error) {
    console.error('doku_notification_failed', error);
    return jsonError('Unable to process DOKU notification', 500);
  }
}
