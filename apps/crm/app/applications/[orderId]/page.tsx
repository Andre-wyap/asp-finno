import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CrmShell } from '../../../components/CrmShell';
import { StatusActions } from '../../../components/StatusActions';
import { NoteForm } from '../../../components/NoteForm';
import { EmailControl } from '../../../components/EmailControl';
import { ArchiveActions } from '../../../components/ArchiveActions';
import { verifyAdmin } from '../../../lib/auth';
import { getDb } from '../../../lib/firebaseAdmin';

type PageParams = Promise<{ orderId: string }>;

function formatDate(ts: unknown, includeTime = false) {
  if (!ts || typeof ts !== 'object') return '—';
  const timestamp = ts as { toDate?: () => Date; seconds?: number };
  const d = timestamp.toDate?.() ?? (timestamp.seconds ? new Date(timestamp.seconds * 1000) : null);
  if (!d) return '—';
  return includeTime
    ? d.toLocaleString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  lead: 'Applied',
  paid: 'Paid',
  payment_failed: 'Payment Failed',
  issued: 'Issued',
  drop: 'Drop'
};

const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-amber-50 text-amber-700 ring-amber-200',
  lead: 'bg-amber-50 text-amber-700 ring-amber-200',
  paid: 'bg-blue-50 text-blue-700 ring-blue-200',
  payment_failed: 'bg-red-50 text-red-700 ring-red-200',
  issued: 'bg-green-50 text-green-700 ring-green-200',
  drop: 'bg-gray-100 text-gray-700 ring-gray-200'
};

const EVENT_ICONS: Record<string, string> = {
  status_change: '⇄',
  note: '✎',
  payment_callback: '💳',
  email_sent: '✉',
  email_event: '📬',
  application_archived: '▣',
  application_unarchived: '▢'
};

export default async function ApplicationDetailPage({ params }: { params: PageParams }) {
  try {
    await verifyAdmin();
  } catch {
    redirect('/login');
  }

  const { orderId } = await params;
  const db = getDb();

  const [appDoc, eventsSnap] = await Promise.all([
    db.collection('applications').doc(orderId).get(),
    db
      .collection('applications')
      .doc(orderId)
      .collection('events')
      .orderBy('at', 'desc')
      .limit(100)
      .get()
  ]);

  if (!appDoc.exists) notFound();

  const app = { id: appDoc.id, ...appDoc.data() } as Record<string, unknown>;
  const events = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Record<
    string,
    unknown
  >[];

  const applicant = (app.applicant as Record<string, unknown>) ?? {};
  const nominees = (app.nominees as Record<string, unknown>[]) ?? [];
  const plan = (app.plan as Record<string, unknown>) ?? {};
  const premium = (app.premium as Record<string, unknown>) ?? {};
  const status = (app.status as string) ?? '';
  const archived = Boolean(app.archivedAt);

  const formatCurrency = (n: unknown) =>
    typeof n === 'number'
      ? new Intl.NumberFormat('en-MY', {
          style: 'currency',
          currency: 'MYR',
          maximumFractionDigits: 2
        }).format(n)
      : '—';

  return (
    <CrmShell>
      <div className="mx-auto max-w-4xl">
        {/* Back */}
        <Link
          href="/applications"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft size={15} />
          All applications
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs text-on-surface-variant">{orderId}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-primary">
              {(applicant.name as string) ?? '—'}
            </h1>
          </div>
          <span
            className={`self-start rounded-full px-3 py-1.5 text-sm font-semibold ring-1 sm:self-auto ${STATUS_COLORS[status] ?? 'bg-surface-container text-on-surface-variant ring-outline-variant'}`}
          >
            {archived ? 'Archived' : (STATUS_LABELS[status] ?? status)}
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Applicant card */}
            <InfoCard title="Applicant">
              <Row label="Name" value={applicant.name as string} />
              <Row
                label="NRIC"
                value={typeof applicant.nric === 'string' ? applicant.nric : 'Not captured'}
              />
              <Row label="Date of birth" value={applicant.dob as string} />
              <Row label="Gender" value={applicant.gender as string} />
              <Row label="Email" value={applicant.email as string} />
              <Row label="Mobile" value={applicant.mobile as string} />
              <Row label="Address" value={applicant.address as string} />
              <Row label="Occupation" value={applicant.occupation as string} />
              <Row label="Smoker" value={(applicant.smoker as boolean) ? 'Yes' : 'No'} />
              {(app.underwritingFlag as boolean) && (
                <div className="col-span-2 mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  Underwriting review required
                </div>
              )}
            </InfoCard>

            {/* Nominees */}
            {nominees.length > 0 && (
              <InfoCard title="Nominees">
                {nominees.map((n, i) => (
                  <div key={i} className="col-span-2 rounded-lg bg-surface-container-low px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                      Nominee {i + 1}
                    </p>
                    <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                      <Row label="Name" value={n.name as string} />
                      <Row label="NRIC" value={typeof n.nric === 'string' ? n.nric : 'Not captured'} />
                      <Row label="Relationship" value={n.relationship as string} />
                      <Row label="Nationality" value={n.nationality as string} />
                    </div>
                  </div>
                ))}
              </InfoCard>
            )}

            {/* Plan & Payment */}
            <InfoCard title="Plan & Payment">
              <Row label="Plan code" value={plan.code as string} />
              <Row label="Age band" value={plan.ageBand as string} />
              <Row label="Occupation category" value={plan.occupationCategory as string} />
              <Row
                label="Base premium"
                value={formatCurrency(premium.baseAnnualPremium)}
              />
              <Row label="SST (8%)" value={formatCurrency(premium.serviceTax)} />
              <Row label="Stamp duty" value={formatCurrency(premium.stampDuty)} />
              {typeof premium.subtotal === 'number' && (
                <Row label="Subtotal" value={formatCurrency(premium.subtotal)} />
              )}
              {typeof premium.discountAmount === 'number' && premium.discountAmount > 0 && (
                <Row
                  label={`Promo discount${(app.promo as { code?: string } | undefined)?.code ? ` (${(app.promo as { code: string }).code})` : ''}`}
                  value={`− ${formatCurrency(premium.discountAmount)}`}
                />
              )}
              <Row label="Total payable" value={formatCurrency(premium.amount)} />
              {typeof app.policyNumber === 'string' && app.policyNumber && (
                <Row label="Policy number" value={app.policyNumber} />
              )}
            </InfoCard>

            {/* Timestamps */}
            <InfoCard title="Timestamps">
              <Row label="Created" value={formatDate(app.createdAt, true)} />
              <Row label="Paid" value={formatDate(app.paidAt, true)} />
              <Row label="Issued" value={formatDate(app.issuedAt, true)} />
              <Row label="Updated" value={formatDate(app.updatedAt, true)} />
              {archived && <Row label="Archived" value={formatDate(app.archivedAt, true)} />}
            </InfoCard>

            {/* Event timeline */}
            <section className="rounded-lg bg-surface-container-lowest shadow-ambient">
              <div className="border-b border-outline-variant/10 px-5 py-4">
                <p className="text-sm font-semibold text-primary">Event timeline</p>
              </div>
              <div className="px-5 py-4">
                {events.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No events recorded.</p>
                ) : (
                  <ol className="space-y-4">
                    {events.map((ev) => {
                      const evPayload = (ev.payload as Record<string, unknown>) ?? {};
                      const actor = (ev.actor as Record<string, unknown>) ?? {};
                      return (
                        <li key={ev.id as string} className="flex gap-3 text-sm">
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-container text-base">
                            {EVENT_ICONS[(ev.type as string) ?? ''] ?? '●'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-primary capitalize">
                              {((ev.type as string) ?? '').replace(/_/g, ' ')}
                              {ev.from && ev.to ? ` · ${ev.from as string} → ${ev.to as string}` : ''}
                            </p>
                            {typeof evPayload.note === 'string' && evPayload.note && (
                              <p className="mt-0.5 text-on-surface-variant">{evPayload.note}</p>
                            )}
                            {typeof evPayload.policyNumber === 'string' &&
                              evPayload.policyNumber && (
                                <p className="mt-0.5 text-on-surface-variant">
                                  Policy: {evPayload.policyNumber}
                                </p>
                              )}
                            {typeof evPayload.template === 'string' && evPayload.template && (
                              <p className="mt-0.5 text-on-surface-variant">
                                Template: {evPayload.template}
                              </p>
                            )}
                            {(ev.type === 'application_archived' ||
                              ev.type === 'application_unarchived') &&
                              typeof evPayload.reason === 'string' &&
                              evPayload.reason && (
                                <p className="mt-0.5 text-on-surface-variant">
                                  Reason: {evPayload.reason}
                                </p>
                              )}
                            <p className="mt-0.5 text-xs text-on-surface-variant">
                              {typeof actor.email === 'string' && actor.email
                                ? actor.email
                                : ((actor.kind as string) ?? 'system')}{' '}
                              · {formatDate(ev.at, true)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </section>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Status actions */}
            {!archived && <StatusActions orderId={orderId} currentStatus={status} />}

            <ArchiveActions orderId={orderId} currentStatus={status} archived={archived} />

            {/* Add note */}
            <NoteForm orderId={orderId} />

            <EmailControl
              orderId={orderId}
              currentStatus={status}
              applicantEmail={applicant.email as string | undefined}
            />

            {/* Tracker token */}
            <InfoCard title="Tracker">
              <div className="col-span-2">
                <p className="mb-1 text-xs text-on-surface-variant">Tracker token</p>
                <p className="break-all font-mono text-xs text-primary">
                  {(app.trackerToken as string) ?? '—'}
                </p>
                {typeof app.trackerToken === 'string' && app.trackerToken && (
                  <a
                    href={`${process.env.TRACKER_BASE_URL ?? 'http://localhost:3000'}/track/${app.trackerToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-secondary underline hover:text-primary"
                  >
                    Open tracker →
                  </a>
                )}
              </div>
            </InfoCard>
          </div>
        </div>
      </div>
    </CrmShell>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-surface-container-lowest shadow-ambient">
      <div className="border-b border-outline-variant/10 px-5 py-4">
        <p className="text-sm font-semibold text-primary">{title}</p>
      </div>
      <div className="grid gap-x-4 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="mt-0.5 font-semibold text-primary">{value ?? '—'}</p>
    </div>
  );
}
