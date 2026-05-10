import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock3, FileCheck2, ShieldCheck } from 'lucide-react';
import type { ApplicationStatus } from '@asp/shared';
import { APPLICATION_STATUSES } from '@asp/shared';
import { getDb } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

type TrackPageParams = {
  token: string;
};

type TimestampLike = {
  toDate?: () => Date;
  seconds?: number;
};

type TrackerApplication = {
  status: ApplicationStatus;
  createdAt: Date | null;
  paidAt: Date | null;
  issuedAt: Date | null;
  policyNumber: string | null;
};

const steps = [
  {
    key: 'lead',
    title: 'Application received',
    description: 'Your application has been submitted for processing.',
    icon: ShieldCheck
  },
  {
    key: 'paid',
    title: 'Payment confirmed',
    description: 'Payment has been matched to your application.',
    icon: CheckCircle2
  },
  {
    key: 'review',
    title: 'Issuance review',
    description: 'The team is reviewing the final issuance details.',
    icon: Clock3
  },
  {
    key: 'issued',
    title: 'Policy issued',
    description: 'Your policy is ready once the policy number appears here.',
    icon: FileCheck2
  }
] as const;

const statusCopy: Record<ApplicationStatus, { title: string; description: string }> = {
  lead: {
    title: 'Application received',
    description: 'We have your application. Complete payment if you have not done so yet.'
  },
  paid: {
    title: 'Payment received',
    description: 'Payment is confirmed. Your application is now in issuance review.'
  },
  payment_failed: {
    title: 'Payment needs attention',
    description: 'Payment was not completed. Please retry payment or contact support.'
  },
  issued: {
    title: 'Policy issued',
    description: 'Your policy has been issued.'
  }
};

function dateFromTimestamp(value: unknown) {
  const timestamp = value as TimestampLike | undefined;

  if (!timestamp) return null;

  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  if (typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }

  return null;
}

function formatDate(date: Date | null) {
  if (!date) return 'Pending';

  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function currentStepIndex(application: TrackerApplication) {
  if (application.status === 'issued') return 3;
  if (application.status === 'paid') return 2;
  if (application.status === 'payment_failed') return 0;
  return 0;
}

function stepDate(application: TrackerApplication, stepKey: (typeof steps)[number]['key']) {
  if (stepKey === 'lead') return application.createdAt;
  if (stepKey === 'paid') return application.paidAt;
  if (stepKey === 'issued') return application.issuedAt;
  return application.status === 'paid' || application.status === 'issued'
    ? application.paidAt
    : null;
}

function normalizeStatus(value: unknown): ApplicationStatus | null {
  return typeof value === 'string' && APPLICATION_STATUSES.includes(value as ApplicationStatus)
    ? (value as ApplicationStatus)
    : null;
}

async function getTrackerApplication(token: string): Promise<TrackerApplication | null> {
  if (!/^[0-9a-fA-F-]{36}$/.test(token)) {
    return null;
  }

  const snapshot = await getDb()
    .collection('applications')
    .where('trackerToken', '==', token)
    .limit(1)
    .get();

  const [doc] = snapshot.docs;

  if (!doc) {
    return null;
  }

  const data = doc.data();
  const status = normalizeStatus(data.status);

  if (!status) {
    return null;
  }

  return {
    status,
    createdAt: dateFromTimestamp(data.createdAt),
    paidAt: dateFromTimestamp(data.paidAt),
    issuedAt: dateFromTimestamp(data.issuedAt),
    policyNumber:
      status === 'issued' && typeof data.policyNumber === 'string'
        ? data.policyNumber
        : null
  };
}

export default async function TrackPage({
  params
}: {
  params: Promise<TrackPageParams>;
}) {
  const { token } = await params;
  const application = await getTrackerApplication(token);

  if (!application) {
    notFound();
  }

  const copy = statusCopy[application.status];
  const activeStep = currentStepIndex(application);

  return (
    <main className="min-h-screen bg-surface px-4 py-12 text-on-surface sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="border-b border-outline-variant/40 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-secondary">
            Issuance tracker
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-primary sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
            {copy.description}
          </p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <SummaryItem label="Current status" value={copy.title} />
          <SummaryItem label="Submitted" value={formatDate(application.createdAt)} />
          <SummaryItem
            label="Policy number"
            value={application.policyNumber ?? 'Available after issuance'}
          />
        </section>

        <section className="mt-10 rounded-lg bg-surface-container-lowest p-5 shadow-ambient sm:p-8">
          <div className="grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isComplete = index <= activeStep && application.status !== 'payment_failed';
              const isCurrent = index === activeStep;

              return (
                <div key={step.key} className="relative">
                  {index < steps.length - 1 && (
                    <div
                      className={`absolute left-6 top-6 hidden h-0.5 w-[calc(100%+1rem)] md:block ${
                        index < activeStep && application.status !== 'payment_failed'
                          ? 'bg-secondary'
                          : 'bg-outline-variant/50'
                      }`}
                    />
                  )}
                  <div className="relative rounded-lg border border-outline-variant/40 bg-white p-4">
                    <div
                      className={`flex size-12 items-center justify-center rounded-full ${
                        isComplete
                          ? 'bg-primary text-on-primary'
                          : isCurrent
                            ? 'bg-primary-fixed text-primary'
                            : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <Icon size={22} />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-primary">{step.title}</h2>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-on-surface-variant">
                      {step.description}
                    </p>
                    <p className="mt-4 text-sm font-semibold text-secondary">
                      {formatDate(stepDate(application, step.key))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {application.status === 'payment_failed' && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <p>
              Payment was not completed for this application. You can retry payment or contact
              support if money was deducted.
            </p>
            <Link
              href={`/payment/retry/${token}`}
              className="mt-4 inline-flex min-h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-secondary"
            >
              Retry payment
            </Link>
          </div>
        )}

        <div className="mt-10">
          <Link
            href="/#plans"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-on-primary hover:bg-secondary"
          >
            Back to plans
          </Link>
        </div>
      </div>
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container-lowest p-5 shadow-ambient">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 text-base font-semibold text-primary">{value}</p>
    </div>
  );
}
