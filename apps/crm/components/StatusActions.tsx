'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

const TRANSITIONS: Record<string, { to: string; label: string; needsPolicyNumber?: boolean }[]> = {
  lead: [],
  paid: [{ to: 'issued', label: 'Mark as Issued', needsPolicyNumber: true }],
  payment_failed: [],
  issued: []
};

export function StatusActions({
  orderId,
  currentStatus
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [policyNumber, setPolicyNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const transitions = TRANSITIONS[currentStatus] ?? [];

  async function handleTransition(to: string, needsPolicyNumber?: boolean) {
    if (needsPolicyNumber && !policyNumber.trim()) {
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
        body: JSON.stringify({ to, policyNumber: needsPolicyNumber ? policyNumber.trim() : undefined })
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Action failed.');
        return;
      }

      setSuccess(`Status updated to "${to}".`);
      setPolicyNumber('');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (transitions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg bg-surface-container-lowest shadow-ambient">
      <div className="border-b border-outline-variant/10 px-5 py-4">
        <p className="text-sm font-semibold text-primary">Actions</p>
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

        {transitions.map(({ to, label, needsPolicyNumber }) => (
          <div key={to} className="space-y-2">
            {needsPolicyNumber && (
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
                  onChange={(e) => {
                    setPolicyNumber(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. POL-2026-001234"
                  className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => handleTransition(to, needsPolicyNumber)}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-secondary disabled:opacity-60"
            >
              <CheckCircle size={16} />
              {loading ? 'Updating…' : label}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
