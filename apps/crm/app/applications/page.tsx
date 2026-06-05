import { redirect } from 'next/navigation';
import { CrmShell } from '../../components/CrmShell';
import { ApplicationsFilters } from '../../components/ApplicationsFilters';
import { ApplicationsTable, type ApplicationRow } from '../../components/ApplicationsTable';
import { verifyAdmin } from '../../lib/auth';
import { getDb } from '../../lib/firebaseAdmin';

const PAGE_SIZE = 20;

const ARCHIVABLE_STATUSES = new Set(['applied', 'lead', 'payment_failed', 'drop']);

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
  const archive = sp.archive ?? 'active';
  const cursor = sp.cursor ?? '';

  const db = getDb();

  let query: FirebaseFirestore.Query = db.collection('applications');

  if (searchField === 'orderId' && search) {
    const doc = await db.collection('applications').doc(search.toUpperCase()).get();
    const applications =
      doc.exists && matchesArchiveFilter({ id: doc.id, ...doc.data() }, archive)
        ? [{ id: doc.id, ...doc.data() }]
        : [];
    return (
      <CrmShell>
        <PageContent applications={applications} nextCursor={null} />
      </CrmShell>
    );
  }

  if (status) query = query.where('status', '==', status);

  if (search && (searchField === 'name' || searchField === 'email')) {
    const field = searchField === 'name' ? 'searchKeys.nameLower' : 'searchKeys.emailLower';
    query = query.where(field, '>=', search).where(field, '<', search + '').orderBy(field);
  } else {
    query = query.orderBy('createdAt', 'desc');
  }

  if (cursor) {
    const cursorDoc = await db.collection('applications').doc(cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.limit(PAGE_SIZE * 2 + 1).get();
  const docs = snapshot.docs;
  const filteredDocs = docs.filter((d) => matchesArchiveFilter(d.data(), archive));
  const hasMore = docs.length > PAGE_SIZE * 2 || filteredDocs.length > PAGE_SIZE;
  const page = filteredDocs.length > PAGE_SIZE ? filteredDocs.slice(0, PAGE_SIZE) : filteredDocs;
  const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].id : null;
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

    const rows: ApplicationRow[] = apps.map((app) => {
      const s = (app.status as string) ?? '';
      const isArchived = Boolean(app.archivedAt);
      const applicant = (app.applicant as Record<string, unknown>) ?? {};
      const plan = (app.plan as Record<string, unknown>) ?? {};
      return {
        id: app.id as string,
        name: (applicant.name as string) ?? '—',
        planCode: (plan.code as string) ?? '—',
        statusLabel: isArchived ? 'Archived' : (STATUS_LABELS[s] ?? s),
        statusColor: STATUS_COLORS[s] ?? 'bg-surface-container text-on-surface-variant',
        createdAt: formatDate(app.createdAt),
        archivable: !isArchived && ARCHIVABLE_STATUSES.has(s)
      };
    });

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
            currentArchive={archive}
          />
        </div>

        <ApplicationsTable
          rows={rows}
          prevHref={prevCursor ? buildUrl(sp, { cursor: '' }) : null}
          nextHref={nc ? buildUrl(sp, { cursor: nc }) : null}
        />
      </div>
    );
  }
}

function matchesArchiveFilter(app: Record<string, unknown>, archive: string) {
  const archived = Boolean(app.archivedAt);
  if (archive === 'archived') return archived;
  if (archive === 'all') return true;
  return !archived;
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
