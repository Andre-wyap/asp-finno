import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/firebaseAdmin';
import {
  buildPaymentUrl,
  formatAmount,
  generatePaymentHash,
  getSenangPayConfig
} from '../../../../lib/senangPay';

type RouteParams = {
  token: string;
};

function sanitizeDetail(value: string) {
  return value.replace(/[^A-Za-z0-9.,\-_]/g, '_').slice(0, 500);
}

function publicBaseUrl() {
  return process.env.TRACKER_BASE_URL ?? 'https://asp.finnomalaysia.com';
}

function publicRedirect(path: string) {
  return NextResponse.redirect(new URL(path, publicBaseUrl()));
}

function trackerRedirect(token: string) {
  return publicRedirect(`/track/${token}`);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const { token } = await params;

  if (!/^[0-9a-fA-F-]{36}$/.test(token)) {
    return publicRedirect('/#plans');
  }

  const db = getDb();
  const snapshot = await db
    .collection('applications')
    .where('trackerToken', '==', token)
    .limit(1)
    .get();
  const [applicationDoc] = snapshot.docs;

  if (!applicationDoc) {
    return publicRedirect('/#plans');
  }

  const application = applicationDoc.data();
  const status = application.status;

  if (status !== 'lead' && status !== 'payment_failed') {
    return trackerRedirect(token);
  }

  const applicant = application.applicant ?? {};
  const premium = application.premium ?? {};
  const payment = application.payment ?? {};
  const plan = application.plan ?? {};
  const amountNumber = typeof premium.amount === 'number' ? premium.amount : Number(payment.amount);
  const amount = Number.isFinite(amountNumber)
    ? formatAmount(amountNumber)
    : String(payment.amount ?? '');

  if (!amount || !applicant.email || !applicant.mobile || !applicant.name) {
    return trackerRedirect(token);
  }

  const orderId = applicationDoc.id;
  const { merchantId, secret, paymentBaseUrl } = getSenangPayConfig();
  const detail =
    typeof payment.detail === 'string' && payment.detail
      ? payment.detail
      : sanitizeDetail(`Allianz_Shield_Plus_${plan.code ?? 'Plan'}_${orderId}`);
  const hash = generatePaymentHash({ secret, detail, amount, orderId });

  await applicationDoc.ref.update({
    'payment.status': 'retry_started',
    'payment.merchantId': merchantId,
    updatedAt: FieldValue.serverTimestamp()
  });

  await applicationDoc.ref.collection('events').add({
    type: 'payment_retry_started',
    actor: { kind: 'customer', id: null },
    payload: { source: 'retry_link' },
    at: FieldValue.serverTimestamp()
  });

  const redirectUrl = buildPaymentUrl({
    merchantId,
    paymentBaseUrl,
    detail,
    amount,
    orderId,
    hash,
    name: applicant.name,
    email: applicant.email,
    phone: applicant.mobile
  });

  return NextResponse.redirect(redirectUrl);
}
