import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CrmShell } from '../../components/CrmShell';
import { ApplicationsFilters } from '../../components/ApplicationsFilters';
import { verifyAdmin } from '../../lib/auth';
import { getDb } from '../../lib/firebaseAdmin';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  lead: 'Applied',
  paid: 'Paid',
  payment_failed: 'Payment Failed',
  issued: 'Issued',
  drop: 'Drop'
};

const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-amber-50 text-amber-700',
  lead: 'bg-amber-50 text-amber-700',
  paid: 'bg-blue-50 text-blue-700',
  payment_failed: 'bg-red-50 text-red-700',
  issued: 'bg-green-50 text-green-700',
  drop: 'bg-gray-100 text-gray-700'
};

function formatDate(ts: unknown) {
  if (!ts || typeof ts !== 'object') return '—';
  const timestamp = ts as { toDate?: () => Date; seconds?: number };
  const d = timestamp.toDate?.() ?? (timestamp.seconds ? new Date(timestamp.seconds * 1000) : null);
  if (!d) return '—';
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function ApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  try {
    await verifyAdmin();
  } catch {
    redirect('/login');
  }

  const sp = await searchParams;
  const status = sp.status ?? '';
  const search = sp.search?.toLowerCase().trim() ?? '';
  const searchField = sp.searchField ?? 'name';
  const cursor = sp.cursor ?? '';

  const db = getDb();

  let query: FirebaseFirestore.Query = db.collection('applications');

  if (searchField === 'orderId' && search) {
    const doc = await db.collection('applications').doc(search.toUpperCase()).get();
    const applications = doc.exists ? [{ id: doc.id, ...doc.data() }] : [];
    return (
      <CrmShell>
        <PageContent applications={applications} nextCursor={null} />
      </CrmShell>
    );
  }

  if (status) query = query.where('status', '==', status);

  if (search && (searchField === 'name' || searchField === 'email')) {
    const field = searchField === 'name' ? 'searchKeys.nameLower' : 'searchKeys.emailLower';
    query = query.where(field, '>=', search).where(field, '<', search + '').orderBy(field);
  } else {
    query = query.orderBy('createdAt', 'desc');
  }

  if (cursor) {
    const cursorDoc = await db.collection('applications').doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.limit(PAGE_SIZE + 1).get();
  const docs = snapshot.docs;
  const hasMore = docs.length > PAGE_SIZE;
  const page = hasMore ? docs.slice(0, PAGE_SIZE) : docs;
  const nextCursor = hasMore ? page[page.length - 1].id : null;
  const applications = page.map((d) => ({ id: d.id, ...d.data() })) as Record<string, unknown>[];

  return (
    <CrmShell>
      <PageContent applications={applications} nextCursor={nextCursor} />
    </CrmShell>
  );

  function PageContent({
    applications: apps,
    nextCursor: nc
  }: {
    applications: Record<string, unknown>[];
    nextCursor: string | null;
  }) {
    const prevCursor = sp.cursor ?? null;

    return (
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
              Manage
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-primary">Applications</h1>
          </div>
          <ApplicationsFilters
            currentStatus={status}
            currentSearch={sp.search ?? ''}
            currentSearchField={searchField}
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-lg bg-surface-container-lowest shadow-ambient">
          {apps.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-on-surface-variant">
              No applications found.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low text-left text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => {
                  const s = (app.status as string) ?? '';
                  const applicant = (app.applicant as Record<string, unknown>) ?? {};
                  const plan = (app.plan as Record<string, unknown>) ?? {};
                  return (
                    <tr
                      key={app.id as string}
                      className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-low/50"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">
                        {app.id as string}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        {(applicant.name as string) ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {(plan.code as string) ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[s] ?? 'bg-surface-container text-on-surface-variant'}`}
                        >
                          {STATUS_LABELS[s] ?? s}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {formatDate(app.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/applications/${app.id as string}`}
                          className="rounded-full bg-primary-fixed/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-fixed"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex gap-3">
          {prevCursor && (
            <Link
              href={buildUrl(sp, { cursor: '' })}
              className="rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-primary shadow-ambient hover:bg-primary-fixed/40"
            >
              ← Back to first page
            </Link>
          )}
          {nc && (
            <Link
              href={buildUrl(sp, { cursor: nc })}
              className="ml-auto rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-secondary"
            >
              Next page →
            </Link>
          )}
        </div>
      </div>
    );
  }
}

function buildUrl(
  current: Record<string, string | undefined>,
  overrides: Record<string, string>
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...overrides })) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return `/applications${qs ? `?${qs}` : ''}`;
}
