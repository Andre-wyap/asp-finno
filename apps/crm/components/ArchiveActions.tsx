'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';

const ARCHIVABLE_STATUSES = new Set(['applied', 'lead', 'payment_failed', 'drop']);

export function ArchiveActions({
  orderId,
  currentStatus,
  archived
}: {
  orderId: string;
  currentStatus: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canArchive = ARCHIVABLE_STATUSES.has(currentStatus);

  async function submit(action: 'archive' | 'unarchive') {
    if (action === 'archive' && !reason.trim()) {
      setError('Archive reason is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/crm/applications/${orderId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined })
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Action failed.');
        return;
      }

      setReason('');
      setSuccess(action === 'archive' ? 'Application archived.' : 'Application restored.');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg bg-surface-container-lowest shadow-ambient">
      <div className="border-b border-outline-variant/10 px-5 py-4">
        <p className="text-sm font-semibold text-primary">
          {archived ? 'Archived application' : 'Archive lead'}
        </p>
        <p className="mt-0.5 text-xs text-on-surface-variant">
          {archived ? 'Restore this record to normal CRM lists.' : 'Hide stale leads from follow-up queues.'}
        </p>
      </div>
      <div className="space-y-3 px-5 py-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
            {success}
          </p>
        )}

        <textarea
          rows={2}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
          placeholder={archived ? 'Restore reason (optional)' : 'Why are you archiving this lead?'}
          className="w-full resize-none rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        <button
          type="button"
          onClick={() => submit(archived ? 'unarchive' : 'archive')}
          disabled={loading || (!archived && (!canArchive || !reason.trim()))}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-fixed/40 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary-fixed disabled:opacity-50"
        >
          {archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          {loading ? 'Updating...' : archived ? 'Restore application' : 'Archive lead'}
        </button>

        {!archived && !canArchive && (
          <p className="text-xs font-semibold text-on-surface-variant">
            Paid and issued applications stay in the active issuance workflow.
          </p>
        )}
      </div>
    </section>
  );
}
