import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CrmShell } from '../../components/CrmShell';
import { verifyAdmin } from '../../lib/auth';
import { getDb } from '../../lib/firebaseAdmin';

const ACTION_LABELS: Record<string, string> = {
  status_change: 'Status change',
  note: 'Note added',
  payment_callback: 'Payment callback',
  email_sent: 'Email sent',
  email_event: 'Email event',
  marketing_email_sent: 'Marketing email sent',
  marketing_email_failed: 'Marketing email failed',
  application_archived: 'Application archived',
  application_unarchived: 'Application restored'
};

function formatDate(ts: unknown) {
  if (!ts || typeof ts !== 'object') return '—';
  const timestamp = ts as { toDate?: () => Date; seconds?: number };
  const d = timestamp.toDate?.() ?? (timestamp.seconds ? new Date(timestamp.seconds * 1000) : null);
  if (!d) return '—';
  return d.toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function timestampMs(ts: unknown) {
  if (!ts || typeof ts !== 'object') return 0;
  const timestamp = ts as { toDate?: () => Date; seconds?: number };
  return timestamp.toDate?.().getTime() ?? (timestamp.seconds ? timestamp.seconds * 1000 : 0);
}

function summarizeEvent(event: Record<string, unknown>) {
  const payload = (event.payload as Record<string, unknown>) ?? {};
  const type = event.type as string;

  if (type === 'status_change') return `${event.from ?? '—'} → ${event.to ?? '—'}`;
  if (type === 'note') return typeof payload.note === 'string' ? payload.note : 'Note added';
  if (type === 'email_sent') return `Template: ${payload.template ?? 'custom'}`;
  if (type === 'email_event') return `Delivery event: ${payload.kind ?? 'unknown'}`;
  if (type === 'application_archived' || type === 'application_unarchived') {
    return typeof payload.reason === 'string' && payload.reason ? payload.reason : 'No reason';
  }
  if (type === 'payment_callback') return `Payment: ${event.to ?? 'unknown'}`;
  if (type?.startsWith('marketing_email_')) return `Campaign: ${payload.campaignId ?? 'unknown'}`;

  return 'PDPA-safe event';
}

export default async function ActivityPage() {
  try {
    await verifyAdmin();
  } catch {
    redirect('/login');
  }

  const db = getDb();
  let events: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  try {
    const appsSnapshot = await db.collection('applications').orderBy('updatedAt', 'desc').limit(50).get();
    const eventSnapshots = await Promise.all(
      appsSnapshot.docs.map(async (appDoc) => {
        try {
          const eventsSnapshot = await appDoc.ref
            .collection('events')
            .orderBy('at', 'desc')
            .limit(10)
            .get();

          return eventsSnapshot.docs.map(
            (eventDoc) =>
              ({
                id: eventDoc.id,
                orderId: appDoc.id,
                ...eventDoc.data()
              }) as Record<string, unknown>
          );
        } catch (err) {
          console.error('activity_events_load_failed', {
            orderId: appDoc.id,
            error: err instanceof Error ? err.message : String(err)
          });
          return [];
        }
      })
    );

    events = eventSnapshots
      .flat()
      .sort((a, b) => timestampMs(b.at) - timestampMs(a.at))
      .slice(0, 100);
  } catch (err) {
    console.error('activity_log_load_failed', err);
    loadError = 'Activity could not be loaded right now.';
  }

  return (
    <CrmShell>
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Audit</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-primary">Activity Log</h1>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg bg-surface-container-lowest shadow-ambient">
          {loadError ? (
            <div className="px-6 py-16 text-center text-sm text-red-700">{loadError}</div>
          ) : events.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-on-surface-variant">
              No activity recorded.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low text-left text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Summary</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const actor = (event.actor as Record<string, unknown>) ?? {};
                  const orderId = event.orderId as string;
                  return (
                    <tr
                      key={`${orderId}-${event.id as string}`}
                      className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-low/50"
                    >
                      <td className="px-4 py-3 text-on-surface-variant">
                        {(actor.email as string) || (actor.id as string) || (actor.kind as string) || 'system'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {formatDate(event.at)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        {ACTION_LABELS[(event.type as string) ?? ''] ?? event.type}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">
                        {orderId ? (
                          <Link href={`/applications/${orderId}`} className="underline hover:text-primary">
                            {orderId}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="max-w-md truncate px-4 py-3 text-on-surface-variant">
                        {summarizeEvent(event)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </CrmShell>
  );
}
