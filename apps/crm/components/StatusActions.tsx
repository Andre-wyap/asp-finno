'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

const ALL_STATUSES: { value: string; label: string; sendsEmail: boolean }[] = [
  { value: 'lead', label: 'Lead', sendsEmail: false },
  { value: 'paid', label: 'Paid', sendsEmail: true },
  { value: 'payment_failed', label: 'Payment Failed', sendsEmail: true },
  { value: 'issued', label: 'Issued', sendsEmail: true }
];

export function StatusActions({
  orderId,
  currentStatus
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<string>('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [note, setNote] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const targetMeta = ALL_STATUSES.find((s) => s.value === target);
  const requiresPolicyNumber = target === 'issued';
  const targetSendsEmail = targetMeta?.sendsEmail ?? false;

  async function handleSubmit() {
    if (!target) {
      setError('Choose a target status.');
      return;
    }
    if (target === currentStatus) {
      setError('That is already the current status.');
      return;
    }
    if (requiresPolicyNumber && !policyNumber.trim()) {
      setError('Policy number is required to issue.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/crm/applications/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: target,
          policyNumber: requiresPolicyNumber ? policyNumber.trim() : undefined,
          note: note.trim() || undefined,
          sendEmail: targetSendsEmail ? sendEmail : false
        })
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Action failed.');
        return;
      }

      setSuccess(`Status updated to "${target}".`);
      setPolicyNumber('');
      setNote('');
      setTarget('');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const options = ALL_STATUSES.filter((s) => s.value !== currentStatus);

  return (
    <section className="rounded-lg bg-surface-container-lowest shadow-ambient">
      <div className="border-b border-outline-variant/10 px-5 py-4">
        <p className="text-sm font-semibold text-primary">Manual status change</p>
        <p className="mt-0.5 text-xs text-on-surface-variant">
          Override the application status. Logged with your admin id.
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

        <div>
          <label
            htmlFor="status-target"
            className="mb-1 block text-xs font-semibold text-on-surface-variant"
          >
            New status
          </label>
          <select
            id="status-target"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setError(null);
            }}
            className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Select…</option>
            {options.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {requiresPolicyNumber && (
          <div>
            <label
              htmlFor="policy-number"
              className="mb-1 block text-xs font-semibold text-on-surface-variant"
            >
              Policy number
            </label>
            <input
              id="policy-number"
              type="text"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              placeholder="e.g. POL-2026-001234"
              className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="status-note"
            className="mb-1 block text-xs font-semibold text-on-surface-variant"
          >
            Reason / note (optional)
          </label>
          <textarea
            id="status-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why are you making this change?"
            className="w-full resize-none rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {targetSendsEmail && (
          <label className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="size-4 rounded border-outline-variant text-primary focus:ring-primary/30"
            />
            Send transactional email for this transition
          </label>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !target}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-secondary disabled:opacity-60"
        >
          <CheckCircle size={16} />
          {loading ? 'Updating…' : `Set to ${targetMeta?.label ?? '…'}`}
        </button>
      </div>
    </section>
  );
}
