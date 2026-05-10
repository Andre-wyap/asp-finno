'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ActivityLog } from '../lib/activity';

const ACTION_LABELS: Record<string, string> = {
  status_change: 'Status change',
  note: 'Note added',
  email_sent: 'Email sent',
  marketing_email_sent: 'Marketing email sent',
  marketing_email_failed: 'Marketing email failed',
  application_archived: 'Application archived',
  application_unarchived: 'Application restored',
  promo_created: 'Promo created',
  promo_updated: 'Promo updated'
};

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function ActivityLogTable({
  initialLogs,
  initialNextCursor,
  initialError
}: {
  initialLogs: ActivityLog[];
  initialNextCursor: string | null;
  initialError?: string | null;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function loadMore() {
    if (!nextCursor) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/crm/activity?cursor=${encodeURIComponent(nextCursor)}&limit=50`
      );
      const data = (await response.json().catch(() => ({}))) as {
        logs?: ActivityLog[];
        nextCursor?: string | null;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? 'Unable to load activity logs.');
        return;
      }

      setLogs((current) => [...current, ...(data.logs ?? [])]);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 overflow-hidden rounded-lg bg-surface-container-lowest shadow-ambient">
      {error && (
        <div className="border-b border-outline-variant/10 px-6 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-on-surface-variant">
          No activity recorded.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
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
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-low/50"
                  >
                    <td className="px-4 py-3 text-on-surface-variant">
                      {log.actor.email || log.actor.id || log.actor.kind || 'system'}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{formatDate(log.at)}</td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">
                      {log.orderId ? (
                        <Link href={`/applications/${log.orderId}`} className="underline hover:text-primary">
                          {log.orderId}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="max-w-md truncate px-4 py-3 text-on-surface-variant">
                      {log.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nextCursor && (
            <div className="border-t border-outline-variant/10 px-5 py-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-secondary disabled:opacity-60"
              >
                {loading ? 'Loading...' : 'Load 50 more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
