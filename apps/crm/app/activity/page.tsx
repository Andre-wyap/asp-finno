import { redirect } from 'next/navigation';
import { ActivityLogTable } from '../../components/ActivityLogTable';
import { CrmShell } from '../../components/CrmShell';
import { fetchActivityLogs, type ActivityLog } from '../../lib/activity';
import { verifyAdmin } from '../../lib/auth';
import { getDb } from '../../lib/firebaseAdmin';

export default async function ActivityPage() {
  try {
    await verifyAdmin();
  } catch {
    redirect('/login');
  }

  let logs: ActivityLog[] = [];
  let nextCursor: string | null = null;
  let loadError: string | null = null;

  try {
    const page = await fetchActivityLogs(getDb(), { limit: 10 });
    logs = page.logs;
    nextCursor = page.nextCursor;
  } catch (err) {
    console.error('activity_page_load_failed', err);
    loadError = 'Activity could not be loaded right now.';
  }

  return (
    <CrmShell>
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Audit</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-primary">Activity Log</h1>
        </div>

        <ActivityLogTable
          initialLogs={logs}
          initialNextCursor={nextCursor}
          initialError={loadError}
        />
      </div>
    </CrmShell>
  );
}
