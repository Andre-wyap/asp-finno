import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { MIN_PROMO_PAYABLE_AMOUNT } from '@asp/shared/promo';
import { planNameFromCode } from '@asp/pricing';
import { getDb } from '../../../../lib/firebaseAdmin';
import {
  buildPaymentUrl,
  formatAmount,
  generatePaymentHash,
  getSenangPayConfig
} from '../../../../lib/senangPay';
import { createDokuCheckoutPayment } from '../../../../lib/doku';
import { getPaymentProvider } from '../../../../lib/paymentProvider';

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

function retryInvoiceNumber(orderId: string) {
  const suffix = Date.now().toString(36).toUpperCase().slice(-8).padStart(8, '0');
  return `${orderId}R${suffix}`.slice(0, 30);
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

  if (status !== 'applied' && status !== 'lead' && status !== 'payment_failed') {
    return trackerRedirect(token);
  }

  const applicant = application.applicant ?? {};
  const premium = application.premium ?? {};
  const payment = application.payment ?? {};
  const plan = application.plan ?? {};
  const amountNumber = typeof premium.amount === 'number' ? premium.amount : Number(payment.amount);
  const normalizedAmountNumber =
    Number.isFinite(amountNumber) && amountNumber > 0 && amountNumber < MIN_PROMO_PAYABLE_AMOUNT
      ? MIN_PROMO_PAYABLE_AMOUNT
      : amountNumber;
  const amount = Number.isFinite(normalizedAmountNumber)
    ? formatAmount(normalizedAmountNumber)
    : String(payment.amount ?? '');

  if (!amount || !applicant.email || !applicant.mobile || !applicant.name) {
    return trackerRedirect(token);
  }

  const orderId = applicationDoc.id;
  const paymentProvider = getPaymentProvider();
  const detail =
    typeof payment.detail === 'string' && payment.detail
      ? payment.detail
      : sanitizeDetail(`Allianz_Shield_Plus_${planNameFromCode(plan.code ?? '') || 'Plan'}_${orderId}`);
  const senangPayConfig =
    paymentProvider === 'senangpay' ? getSenangPayConfig() : null;
  const dokuCheckout =
    paymentProvider === 'doku'
      ? await createDokuCheckoutPayment({
          orderId,
          invoiceNumber: retryInvoiceNumber(orderId),
          amount: normalizedAmountNumber,
          detail,
          customer: {
            name: applicant.name,
            email: applicant.email,
            phone: applicant.mobile,
            address: applicant.address
          },
          baseUrl: publicBaseUrl()
        })
      : null;
  const senangPayHash = senangPayConfig
    ? generatePaymentHash({
        secret: senangPayConfig.secret,
        detail,
        amount,
        orderId
      })
    : null;

  const updatePayload: Record<string, unknown> = {
    'payment.status': 'retry_started',
    'payment.provider': paymentProvider,
    'payment.merchantId': senangPayConfig?.merchantId ?? null,
    'payment.dokuClientId': paymentProvider === 'doku' ? process.env.DOKU_CLIENT_ID : null,
    'payment.providerInvoiceNumber': dokuCheckout?.invoiceNumber ?? null,
    'payment.requestId': dokuCheckout?.requestId ?? null,
    'payment.tokenId': dokuCheckout?.tokenId ?? null,
    'payment.sessionId': dokuCheckout?.sessionId ?? null,
    'payment.providerAmount': dokuCheckout?.providerAmount ?? null,
    'payment.paymentUrl': dokuCheckout?.redirectUrl ?? null,
    updatedAt: FieldValue.serverTimestamp()
  };

  if (normalizedAmountNumber !== amountNumber) {
    updatePayload['premium.amount'] = normalizedAmountNumber;
    updatePayload['payment.amount'] = amount;

    if (typeof premium.subtotal === 'number') {
      updatePayload['premium.discountAmount'] = Math.max(0, premium.subtotal - normalizedAmountNumber);
    }
  }

  await applicationDoc.ref.update(updatePayload);

  await applicationDoc.ref.collection('events').add({
    type: 'payment_retry_started',
    actor: { kind: 'customer', id: null },
    payload: { source: 'retry_link' },
    at: FieldValue.serverTimestamp()
  });

  const redirectUrl = dokuCheckout
    ? dokuCheckout.redirectUrl
    : buildPaymentUrl({
        merchantId: senangPayConfig!.merchantId,
        paymentBaseUrl: senangPayConfig!.paymentBaseUrl,
        detail,
        amount,
        orderId,
        hash: senangPayHash!,
        name: applicant.name,
        email: applicant.email,
        phone: applicant.mobile
      });

  return NextResponse.redirect(redirectUrl);
}
