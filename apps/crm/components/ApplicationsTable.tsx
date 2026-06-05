'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, X } from 'lucide-react';

export type ApplicationRow = {
  id: string;
  name: string;
  planCode: string;
  statusLabel: string;
  statusColor: string;
  createdAt: string;
  archivable: boolean;
  archived: boolean;
};

const SKIP_LABELS: Record<string, string> = {
  not_found: 'not found',
  already_archived: 'already archived',
  not_archivable: 'not an archivable status',
  not_archived: 'not archived'
};

export function ApplicationsTable({
  rows,
  prevHref,
  nextHref,
  mode
}: {
  rows: ApplicationRow[];
  prevHref: string | null;
  nextHref: string | null;
  mode: 'archive' | 'unarchive';
}) {
  const isUnarchive = mode === 'unarchive';
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectableIds = useMemo(
    () => rows.filter((r) => (isUnarchive ? r.archived : r.archivable)).map((r) => r.id),
    [rows, isUnarchive]
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSuccess(null);
    setError(null);
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
    setSuccess(null);
    setError(null);
  }

  function clearSelection() {
    setSelected(new Set());
    setReason('');
    setError(null);
  }

  async function applySelected() {
    if (selected.size === 0) return;
    if (!isUnarchive && !reason.trim()) {
      setError('Archive reason is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const endpoint = isUnarchive
        ? '/api/crm/applications/bulk-unarchive'
        : '/api/crm/applications/bulk-archive';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selected), reason: reason.trim() || undefined })
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        archivedCount?: number;
        restoredCount?: number;
        skippedCount?: number;
        skipped?: Array<{ orderId: string; reason: string }>;
      };

      if (!response.ok) {
        setError(data.error ?? (isUnarchive ? 'Bulk restore failed.' : 'Bulk archive failed.'));
        return;
      }

      const count = isUnarchive ? (data.restoredCount ?? 0) : (data.archivedCount ?? 0);
      const verb = isUnarchive ? 'Restored' : 'Archived';
      const parts = [`${verb} ${count} application(s).`];
      if (data.skippedCount) {
        const detail = (data.skipped ?? [])
          .map((s) => `${s.orderId} (${SKIP_LABELS[s.reason] ?? s.reason})`)
          .join(', ');
        parts.push(`Skipped ${data.skippedCount}: ${detail}`);
      }
      setSuccess(parts.join(' '));
      setSelected(new Set());
      setReason('');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="mt-6 overflow-hidden rounded-lg bg-surface-container-lowest shadow-ambient">
        <div className="px-6 py-16 text-center text-sm text-on-surface-variant">
          No applications found.
        </div>
      </div>
    );
  }

  return (
    <div>
      {(success || error) && (
        <div
          className={`mt-4 rounded-lg px-4 py-3 text-sm font-semibold ${
            error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}
        >
          {error ?? success}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-lg bg-surface-container-lowest shadow-ambient">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/20 bg-surface-container-low text-left text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label={isUnarchive ? 'Select all archived applications' : 'Select all archivable applications'}
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={selectableIds.length === 0}
                  className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                />
              </th>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-low/50 ${
                  selected.has(row.id) ? 'bg-primary-fixed/20' : ''
                }`}
              >
                <td className="px-4 py-3">
                  {(isUnarchive ? row.archived : row.archivable) ? (
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.id}`}
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      className="size-4 cursor-pointer accent-primary"
                    />
                  ) : (
                    <span className="block size-4" />
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{row.id}</td>
                <td className="px-4 py-3 font-semibold text-primary">{row.name}</td>
                <td className="px-4 py-3 text-on-surface-variant">{row.planCode}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.statusColor}`}>
                    {row.statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{row.createdAt}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/applications/${row.id}`}
                    className="rounded-full bg-primary-fixed/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-fixed"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex gap-3">
        {prevHref && (
          <Link
            href={prevHref}
            className="rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-primary shadow-ambient hover:bg-primary-fixed/40"
          >
            ← Back to first page
          </Link>
        )}
        {nextHref && (
          <Link
            href={nextHref}
            className="ml-auto rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-secondary"
          >
            Next page →
          </Link>
        )}
      </div>

      {/* Bulk archive toolbar */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 z-10 mt-4 rounded-lg bg-surface-container-lowest p-4 shadow-ambient ring-1 ring-primary/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <span className="rounded-full bg-primary px-2.5 py-1 text-xs text-on-primary">
                {selected.size}
              </span>
              selected
              <button
                type="button"
                onClick={clearSelection}
                className="ml-1 flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-primary"
              >
                <X size={14} /> Clear
              </button>
            </div>
            <input
              type="text"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              placeholder={
                isUnarchive ? 'Reason for restoring (optional)' : 'Reason for archiving these leads'
              }
              className="flex-1 rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={applySelected}
              disabled={loading || (!isUnarchive && !reason.trim())}
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-secondary disabled:opacity-50"
            >
              {isUnarchive ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              {loading
                ? isUnarchive
                  ? 'Restoring...'
                  : 'Archiving...'
                : `${isUnarchive ? 'Restore' : 'Archive'} ${selected.size}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
