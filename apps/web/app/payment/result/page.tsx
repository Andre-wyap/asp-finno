import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock, FileText, RotateCcw } from 'lucide-react';
import { getDb } from '../../../lib/firebaseAdmin';
import {
  getSenangPayConfig,
  mapSenangPayStatus,
  parseSenangPayParams,
  verifyReturnHash
} from '../../../lib/senangPay';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  applied: 'Application received',
  lead: 'Application received',
  paid: 'Payment received',
  payment_failed: 'Payment failed',
  issued: 'Policy issued',
  drop: 'Application closed',
};

type PaymentResultSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function displayMessage(value: string) {
  return value.replace(/_/g, ' ') || 'Payment status received.';
}

async function getApplicationStatus(orderId: string) {
  try {
    const snapshot = await getDb().collection('applications').doc(orderId).get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data();

    return {
      status: data?.status as string | undefined,
      trackerToken: typeof data?.trackerToken === 'string' ? data.trackerToken : undefined
    };
  } catch (error) {
    console.error('payment_result_lookup_failed', error);
    return null;
  }
}

export default async function PaymentResultPage({
  searchParams
}: {
  searchParams: Promise<PaymentResultSearchParams>;
}) {
  const rawParams = await searchParams;
  const params = parseSenangPayParams(
    new URLSearchParams({
      status_id: first(rawParams.status_id) ?? '',
      order_id: first(rawParams.order_id) ?? '',
      transaction_id: first(rawParams.transaction_id) ?? '',
      msg: first(rawParams.msg) ?? '',
      hash: first(rawParams.hash) ?? ''
    })
  );

  const providerStatus = mapSenangPayStatus(params.statusId);
  const application = params.orderId ? await getApplicationStatus(params.orderId) : null;
  let hashVerified = false;

  try {
    const { secret } = getSenangPayConfig();
    hashVerified = verifyReturnHash(params, secret);
  } catch {
    hashVerified = false;
  }

  const isSuccess = hashVerified && providerStatus === 'success';
  const isPending = hashVerified && providerStatus === 'pending';
  const Icon = isSuccess ? CheckCircle2 : isPending ? Clock : AlertCircle;
  const title = isSuccess
    ? 'Payment received'
    : isPending
      ? 'Payment pending'
      : 'Payment unsuccessful';
  const message = hashVerified
    ? displayMessage(params.message)
    : 'We could not verify the payment response. Please contact support with your order ID.';

  return (
    <main className="min-h-screen bg-surface px-4 py-16 text-on-surface sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg bg-surface-container-lowest p-8 shadow-ambient">
          <div
            className={`flex size-14 items-center justify-center rounded-full ${
              isSuccess
                ? 'bg-emerald-100 text-emerald-700'
                : isPending
                  ? 'bg-primary-fixed text-primary'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            <Icon size={28} />
          </div>

          <h1 className="mt-6 font-display text-4xl font-semibold text-primary">
            {title}
          </h1>
          <p className="mt-3 text-on-surface-variant">{message}</p>

          <div className="mt-8 grid gap-3 rounded-lg bg-surface-container-low p-5 text-sm">
            <ResultRow label="Order ID" value={params.orderId || 'Unavailable'} />
            <ResultRow
              label="Transaction ID"
              value={params.transactionId || 'Unavailable'}
            />
            <ResultRow
              label="Current status"
              value={STATUS_LABELS[application?.status ?? ''] ?? providerStatus}
            />
            <ResultRow label="Hash verification" value={hashVerified ? 'Verified' : 'Failed'} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {isSuccess ? (
              <Link
                href="/"
                className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-on-primary hover:bg-secondary"
              >
                <FileText size={17} />
                Back to home
              </Link>
            ) : application?.trackerToken ? (
              <Link
                href={`/payment/retry/${application.trackerToken}`}
                className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-on-primary hover:bg-secondary"
              >
                <RotateCcw size={17} />
                Retry payment
              </Link>
            ) : (
              <Link
                href="/#plans"
                className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-on-primary hover:bg-secondary"
              >
                <RotateCcw size={17} />
                Choose a plan again
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-on-surface-variant">{label}</span>
      <span className="text-right font-semibold text-primary">{value}</span>
    </div>
  );
}
