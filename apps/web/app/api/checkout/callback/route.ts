import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/firebaseAdmin';
import {
  getSenangPayConfig,
  mapSenangPayStatus,
  parseSenangPayParams,
  type SenangPayReturnParams,
  verifyReturnHash
} from '../../../../lib/senangPay';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function eventIdFor(params: SenangPayReturnParams) {
  const raw = `${params.transactionId || 'no-txn'}_${params.statusId}_${params.orderId}`;
  return `payment_callback_${raw.replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

async function paramsFromRequest(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = await request.json();
    return new URLSearchParams(
      Object.entries(body).flatMap(([key, value]) =>
        typeof value === 'string' ? [[key, value]] : []
      )
    );
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return new URLSearchParams(await request.text());
  }

  return new URL(request.url).searchParams;
}

async function handleCallback(request: Request) {
  let params: SenangPayReturnParams;

  try {
    params = parseSenangPayParams(await paramsFromRequest(request));
  } catch {
    return jsonError('Invalid callback payload');
  }

  if (!params.orderId) {
    return jsonError('order_id is required');
  }

  const { secret } = getSenangPayConfig();

  if (!verifyReturnHash(params, secret)) {
    return jsonError('Invalid Senang Pay hash', 401);
  }

  const db = getDb();
  const applicationRef = db.collection('applications').doc(params.orderId);
  const eventRef = applicationRef.collection('events').doc(eventIdFor(params));
  const providerStatus = mapSenangPayStatus(params.statusId);
  const nextStatus =
    providerStatus === 'success'
      ? 'paid'
      : providerStatus === 'failed'
        ? 'payment_failed'
        : null;

  await db.runTransaction(async (transaction) => {
    const [applicationSnapshot, eventSnapshot] = await Promise.all([
      transaction.get(applicationRef),
      transaction.get(eventRef)
    ]);

    if (!applicationSnapshot.exists) {
      throw new Error(`Application not found: ${params.orderId}`);
    }

    if (eventSnapshot.exists) {
      return;
    }

    const currentStatus = applicationSnapshot.get('status') as string | undefined;
    const statusPatch =
      nextStatus && currentStatus !== nextStatus
        ? {
            status: nextStatus,
            ...(nextStatus === 'paid' ? { paidAt: FieldValue.serverTimestamp() } : {})
          }
        : {};

    transaction.update(applicationRef, {
      ...statusPatch,
      payment: {
        ...(applicationSnapshot.get('payment') ?? {}),
        provider: 'senangpay',
        status: providerStatus,
        transactionId: params.transactionId,
        lastMessage: params.message,
        hashVerifiedAt: FieldValue.serverTimestamp()
      },
      updatedAt: FieldValue.serverTimestamp()
    });

    transaction.set(eventRef, {
      type: 'payment_callback',
      from: currentStatus ?? null,
      to: nextStatus ?? currentStatus ?? null,
      actor: { kind: 'system', id: 'senangpay' },
      payload: {
        provider: 'senangpay',
        statusId: params.statusId,
        providerStatus,
        orderId: params.orderId,
        transactionId: params.transactionId,
        message: params.message
      },
      at: FieldValue.serverTimestamp()
    });

    if (nextStatus && currentStatus !== nextStatus) {
      transaction.set(applicationRef.collection('events').doc(), {
        type: 'status_change',
        from: currentStatus ?? null,
        to: nextStatus,
        actor: { kind: 'system', id: 'senangpay' },
        payload: {
          provider: 'senangpay',
          transactionId: params.transactionId
        },
        at: FieldValue.serverTimestamp()
      });
    }
  });

  return NextResponse.json({ ok: true, orderId: params.orderId, status: providerStatus });
}

export async function POST(request: Request) {
  try {
    return await handleCallback(request);
  } catch (error) {
    console.error('senangpay_callback_failed', error);
    return jsonError('Unable to process callback', 500);
  }
}

export async function GET(request: Request) {
  try {
    return await handleCallback(request);
  } catch (error) {
    console.error('senangpay_callback_failed', error);
    return jsonError('Unable to process callback', 500);
  }
}
