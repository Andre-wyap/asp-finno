import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock3, FileCheck2, ShieldCheck } from 'lucide-react';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@asp/shared/status';
import {
  ageBandLabels,
  commonBenefits,
  getPlanByCode,
  occupationCategoryLabels,
  plans,
  type AgeBand,
  type OccupationCategory
} from '@asp/pricing';
import { getDb } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

type TrackPageParams = {
  token: string;
};

type TimestampLike = {
  toDate?: () => Date;
  seconds?: number;
};

type TrackerApplicant = {
  name: string;
  dob: string | null;
  email: string;
  mobile: string;
  address: string;
  gender: 'M' | 'F' | null;
  occupation: string;
  smoker: boolean;
};

type TrackerNominee = {
  name: string;
  relationship: string;
  nationality: string;
};

type TrackerPlan = {
  code: string;
  ageBand: AgeBand | null;
  occupationCategory: OccupationCategory | null;
};

type TrackerPremium = {
  amount: number;
  baseAnnualPremium: number | null;
  serviceTax: number | null;
  stampDuty: number | null;
  subtotal: number | null;
  discountAmount: number | null;
  currency: string;
};

type TrackerApplication = {
  status: ApplicationStatus;
  createdAt: Date | null;
  paidAt: Date | null;
  issuedAt: Date | null;
  policyNumber: string | null;
  applicant: TrackerApplicant;
  nominees: TrackerNominee[];
  plan: TrackerPlan;
  premium: TrackerPremium;
};

const steps = [
  {
    key: 'applied',
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
  applied: {
    title: 'Application received',
    description: 'We have your application. Complete payment if you have not done so yet.'
  },
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
  },
  drop: {
    title: 'Application closed',
    description: 'This application is no longer active. Please contact support if this is unexpected.'
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

function formatCurrency(value: number, currency = 'MYR') {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function formatDob(dob: string | null) {
  if (!dob) return '—';
  const parsed = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dob;
  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(parsed);
}

function genderLabel(value: 'M' | 'F' | null) {
  if (value === 'M') return 'Male';
  if (value === 'F') return 'Female';
  return '—';
}

function currentStepIndex(application: TrackerApplication) {
  if (application.status === 'issued') return 3;
  if (application.status === 'paid') return 2;
  if (application.status === 'payment_failed') return 0;
  return 0;
}

function stepDate(application: TrackerApplication, stepKey: (typeof steps)[number]['key']) {
  if (stepKey === 'applied') return application.createdAt;
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

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeAgeBand(value: unknown): AgeBand | null {
  return value === 'age_50_and_below' || value === 'age_51_to_65' ? value : null;
}

function normalizeCategory(value: unknown): OccupationCategory | null {
  return value === 'A' || value === 'B' ? value : null;
}

function normalizeGender(value: unknown): 'M' | 'F' | null {
  return value === 'M' || value === 'F' ? value : null;
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

  const applicantRaw = (data.applicant ?? {}) as Record<string, unknown>;
  const planRaw = (data.plan ?? {}) as Record<string, unknown>;
  const premiumRaw = (data.premium ?? {}) as Record<string, unknown>;
  const nomineesRaw = Array.isArray(data.nominees) ? data.nominees : [];

  return {
    status,
    createdAt: dateFromTimestamp(data.createdAt),
    paidAt: dateFromTimestamp(data.paidAt),
    issuedAt: dateFromTimestamp(data.issuedAt),
    policyNumber:
      status === 'issued' && typeof data.policyNumber === 'string' ? data.policyNumber : null,
    applicant: {
      name: asString(applicantRaw.name),
      dob: asString(applicantRaw.dob) || null,
      email: asString(applicantRaw.email),
      mobile: asString(applicantRaw.mobile),
      address: asString(applicantRaw.address),
      gender: normalizeGender(applicantRaw.gender),
      occupation: asString(applicantRaw.occupation),
      smoker: Boolean(applicantRaw.smoker)
    },
    nominees: nomineesRaw.map((entry) => {
      const nominee = (entry ?? {}) as Record<string, unknown>;
      return {
        name: asString(nominee.name),
        relationship: asString(nominee.relationship),
        nationality: asString(nominee.nationality) || 'Malaysian'
      };
    }),
    plan: {
      code: asString(planRaw.code),
      ageBand: normalizeAgeBand(planRaw.ageBand),
      occupationCategory: normalizeCategory(planRaw.occupationCategory)
    },
    premium: {
      amount: asNumber(premiumRaw.amount) ?? 0,
      baseAnnualPremium: asNumber(premiumRaw.baseAnnualPremium),
      serviceTax: asNumber(premiumRaw.serviceTax),
      stampDuty: asNumber(premiumRaw.stampDuty),
      subtotal: asNumber(premiumRaw.subtotal),
      discountAmount: asNumber(premiumRaw.discountAmount),
      currency: asString(premiumRaw.currency) || 'MYR'
    }
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
  const plan = getPlanByCode(application.plan.code);
  const planIndex = plan ? plans.findIndex((candidate) => candidate.code === plan.code) : -1;
  const ageBandLabel = application.plan.ageBand ? ageBandLabels[application.plan.ageBand] : null;
  const occupationCategoryLabel = application.plan.occupationCategory
    ? occupationCategoryLabels[application.plan.occupationCategory]
    : null;
  const currency = application.premium.currency || 'MYR';

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

        <section className="mt-10 rounded-lg bg-surface-container-lowest p-5 shadow-ambient sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-primary">Applicant details</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Submitted with this application.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <DetailRow label="Full name" value={application.applicant.name || '—'} />
            <DetailRow label="Date of birth" value={formatDob(application.applicant.dob)} />
            <DetailRow label="Gender" value={genderLabel(application.applicant.gender)} />
            <DetailRow label="Email" value={application.applicant.email || '—'} />
            <DetailRow label="Mobile" value={application.applicant.mobile || '—'} />
            <DetailRow label="Occupation" value={application.applicant.occupation || '—'} />
            <DetailRow
              label="Smoker"
              value={application.applicant.smoker ? 'Yes' : 'No'}
            />
            <DetailRow
              label="Address"
              value={application.applicant.address || '—'}
              fullWidth
            />
          </dl>
        </section>

        <section className="mt-8 rounded-lg bg-surface-container-lowest p-5 shadow-ambient sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-primary">Nominee details</h2>
          {application.nominees.length === 0 ? (
            <p className="mt-4 text-sm text-on-surface-variant">No nominees on file.</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {application.nominees.map((nominee, index) => (
                <div
                  key={`${nominee.name}-${index}`}
                  className="rounded-lg bg-surface-container-low p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                    Nominee {index + 1}
                  </p>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <DetailRow label="Name" value={nominee.name || '—'} compact />
                    <DetailRow
                      label="Relationship"
                      value={nominee.relationship || '—'}
                      compact
                    />
                    <DetailRow label="Nationality" value={nominee.nationality} compact />
                  </dl>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-lg bg-surface-container-lowest p-5 shadow-ambient sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Plan summary
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-primary">
                {plan ? plan.name : application.plan.code || 'Plan details'}
              </h2>
              {(ageBandLabel || occupationCategoryLabel) && (
                <p className="mt-2 text-sm text-on-surface-variant">
                  {[ageBandLabel, occupationCategoryLabel].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Premium paid
              </p>
              <p className="mt-1 font-display text-3xl font-semibold text-primary">
                {formatCurrency(application.premium.amount, currency)}
              </p>
            </div>
          </div>

          {plan && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat label="Sum assured" value={formatCurrency(plan.sumAssured, currency)} />
              <Stat
                label="Medical expenses"
                value={formatCurrency(plan.medicalExpenses, currency)}
              />
              <Stat
                label="Renewal bonus"
                value={`Up to ${plan.renewalBonus.percent}%`}
              />
            </div>
          )}

          {application.premium.subtotal !== null && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {application.premium.baseAnnualPremium !== null && (
                <Stat
                  label="Base premium"
                  value={formatCurrency(application.premium.baseAnnualPremium, currency)}
                />
              )}
              {application.premium.serviceTax !== null && (
                <Stat
                  label="Service tax (8%)"
                  value={formatCurrency(application.premium.serviceTax, currency)}
                />
              )}
              {application.premium.stampDuty !== null && (
                <Stat
                  label="Stamp duty"
                  value={formatCurrency(application.premium.stampDuty, currency)}
                />
              )}
              {application.premium.discountAmount !== null &&
                application.premium.discountAmount > 0 && (
                  <Stat
                    label="Discount"
                    value={`− ${formatCurrency(application.premium.discountAmount, currency)}`}
                  />
                )}
            </div>
          )}

          {plan && planIndex >= 0 && (
            <div className="mt-8 border-t border-outline-variant/40 pt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                All 19 benefits
              </p>
              <div className="mt-4 grid gap-3 text-sm text-on-surface-variant">
                <BenefitLine
                  label="Accidental death / permanent disablement"
                  value={formatCurrency(plan.sumAssured, currency)}
                />
                <BenefitLine
                  label="Medical expenses"
                  value={formatCurrency(plan.medicalExpenses, currency)}
                />
                <BenefitLine
                  label="Hospital income"
                  value={`${formatCurrency(commonBenefits.hospitalIncomePerDayMax180Days[planIndex], currency)} per day, max 180 days`}
                />
                <BenefitLine
                  label="Alternative medicine"
                  value={formatCurrency(commonBenefits.alternativeMedicine.planValues[planIndex], currency)}
                />
                <BenefitLine
                  label="Renewal bonus"
                  value={`Up to ${plan.renewalBonus.percent}% of Principal Sum Insured`}
                />
                <BenefitLine
                  label="Blood transfusion"
                  value={commonBenefits.bloodTransfusion}
                />
                <BenefitLine
                  label="Dental correction & corrective cosmetic surgery"
                  value={formatCurrency(
                    commonBenefits.dentalCorrectionAndCorrectiveCosmeticSurgery,
                    currency
                  )}
                />
                <BenefitLine
                  label="Permanent impotency or infertility"
                  value={commonBenefits.permanentImpotencyOrInfertility}
                />
                <BenefitLine
                  label="Kidnap expense & reward"
                  value={`${formatCurrency(commonBenefits.kidnap.expense, currency)} expense · ${formatCurrency(commonBenefits.kidnap.reward, currency)} reward`}
                />
                <BenefitLine
                  label="Ambulance fee"
                  value={formatCurrency(commonBenefits.ambulanceFee, currency)}
                />
                <BenefitLine
                  label="Funeral expenses"
                  value={formatCurrency(commonBenefits.funeralExpenses, currency)}
                />
                <BenefitLine
                  label="Bereavement allowance"
                  value={commonBenefits.bereavementAllowance}
                />
                <BenefitLine
                  label="Personal liability"
                  value={commonBenefits.personalLiability}
                />
                <BenefitLine
                  label="Mobility expenses"
                  value={formatCurrency(commonBenefits.mobilityExpenses, currency)}
                />
                <BenefitLine
                  label="Repatriation expenses"
                  value={formatCurrency(commonBenefits.repatriationExpenses, currency)}
                />
                <BenefitLine
                  label="Miscarriage due to accident"
                  value={formatCurrency(commonBenefits.miscarriageDueToAccident, currency)}
                />
                <BenefitLine
                  label="Compassionate care"
                  value={formatCurrency(commonBenefits.compassionateCare, currency)}
                />
                <BenefitLine
                  label="Snatch theft / attempted snatch theft"
                  value={formatCurrency(commonBenefits.snatchTheftOrAttemptedSnatchTheft, currency)}
                />
                <BenefitLine label="Double indemnity" value={commonBenefits.doubleIndemnity} />
              </div>
            </div>
          )}
        </section>

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

function DetailRow({
  label,
  value,
  fullWidth = false,
  compact = false
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <dt
        className={`text-xs font-semibold uppercase tracking-widest text-on-surface-variant ${
          compact ? '' : ''
        }`}
      >
        {label}
      </dt>
      <dd
        className={`mt-1 break-words font-semibold text-primary ${compact ? 'text-sm' : 'text-base'}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container-low px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p className="mt-1 font-semibold text-primary">{value}</p>
    </div>
  );
}

function BenefitLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[0.7fr_1fr] sm:gap-4">
      <p className="font-semibold text-primary">{label}</p>
      <p>{value}</p>
    </div>
  );
}
