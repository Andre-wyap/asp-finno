'use client';

import { useState } from 'react';
import { Eye, Send, AlertCircle } from 'lucide-react';

const STATUSES = [
  { value: 'lead', label: 'Lead' },
  { value: 'paid', label: 'Paid' },
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'issued', label: 'Issued' }
];

const CATEGORIES = [
  { value: 'A', label: 'Category A' },
  { value: 'B', label: 'Category B' }
];

type Recipient = {
  orderId: string;
  name: string;
  email: string;
  status: string;
  planCode: string;
};

export function EmailMarketingPanel({
  planOptions
}: {
  planOptions: { code: string; name: string }[];
}) {
  const [statuses, setStatuses] = useState<string[]>([]);
  const [planCodes, setPlanCodes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [paid, setPaid] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewSample, setPreviewSample] = useState<Recipient[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(
    null
  );
  const [confirmText, setConfirmText] = useState('');

  function toggle<T extends string>(list: T[], setter: (next: T[]) => void, value: T) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const filters = {
    statuses,
    planCodes,
    occupationCategories: categories,
    paid,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined
  };

  async function previewRecipients() {
    setPreviewing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/crm/email-marketing/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Unable to preview.');
        setPreviewCount(null);
        setPreviewSample([]);
        return;
      }
      const data = (await res.json()) as { total: number; sample: Recipient[] };
      setPreviewCount(data.total);
      setPreviewSample(data.sample);
    } catch {
      setError('Network error during preview.');
    } finally {
      setPreviewing(false);
    }
  }

  async function sendCampaign() {
    if (!previewCount) {
      setError('Preview the recipients first.');
      return;
    }
    if (!subject.trim() || !htmlBody.trim()) {
      setError('Subject and body are required.');
      return;
    }
    if (confirmText !== `SEND ${previewCount}`) {
      setError(`Type "SEND ${previewCount}" to confirm.`);
      return;
    }
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/crm/email-marketing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters,
          subject: subject.trim(),
          htmlBody: htmlBody.trim(),
          campaignName: campaignName.trim() || undefined,
          confirmCount: previewCount
        })
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Send failed.');
        return;
      }
      const data = (await res.json()) as { sent: number; failed: number; total: number };
      setResult(data);
      setConfirmText('');
    } catch {
      setError('Network error while sending.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Filters */}
      <section className="rounded-lg bg-surface-container-lowest p-5 shadow-ambient">
        <p className="text-sm font-semibold text-primary">Recipient filters</p>

        <div className="mt-4 grid gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggle(statuses, setStatuses, s.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    statuses.includes(s.value)
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-primary-fixed/40'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Plan
            </p>
            <div className="flex flex-wrap gap-2">
              {planOptions.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => toggle(planCodes, setPlanCodes, p.code)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    planCodes.includes(p.code)
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-primary-fixed/40'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Occupation category
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggle(categories, setCategories, c.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    categories.includes(c.value)
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-primary-fixed/40'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="paid-filter"
                className="mb-1 block text-xs font-semibold text-on-surface-variant"
              >
                Paid status
              </label>
              <select
                id="paid-filter"
                value={paid}
                onChange={(e) => setPaid(e.target.value as 'all' | 'paid' | 'unpaid')}
                className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All</option>
                <option value="paid">Paid (paid + issued)</option>
                <option value="unpaid">Unpaid (lead + payment_failed)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="date-from"
                className="mb-1 block text-xs font-semibold text-on-surface-variant"
              >
                Created from
              </label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label
                htmlFor="date-to"
                className="mb-1 block text-xs font-semibold text-on-surface-variant"
              >
                Created to
              </label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={previewRecipients}
          disabled={previewing}
          className="mt-5 flex items-center gap-2 rounded-full bg-primary-fixed/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-fixed disabled:opacity-60"
        >
          <Eye size={15} />
          {previewing ? 'Loading…' : 'Preview recipients'}
        </button>

        {previewCount !== null && (
          <div className="mt-4 rounded-lg bg-surface-container-low p-4 text-sm">
            <p className="font-semibold text-primary">
              {previewCount} recipient{previewCount === 1 ? '' : 's'} match
            </p>
            {previewCount > 0 && (
              <div className="mt-3 max-h-48 overflow-y-auto text-xs text-on-surface-variant">
                <ul className="space-y-1">
                  {previewSample.map((r) => (
                    <li key={r.orderId} className="flex justify-between gap-2">
                      <span className="truncate">
                        {r.name || r.orderId} · <span className="font-mono">{r.email}</span>
                      </span>
                      <span className="shrink-0 text-on-surface-variant">{r.status}</span>
                    </li>
                  ))}
                </ul>
                {previewCount > previewSample.length && (
                  <p className="mt-2 italic">
                    …and {previewCount - previewSample.length} more
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Compose */}
      <section className="rounded-lg bg-surface-container-lowest p-5 shadow-ambient">
        <p className="text-sm font-semibold text-primary">Compose</p>
        <p className="mt-1 text-xs text-on-surface-variant">
          Use <code>{'{{name}}'}</code> in subject or body to insert the applicant&apos;s name.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="campaign-name"
              className="mb-1 block text-xs font-semibold text-on-surface-variant"
            >
              Campaign name (internal)
            </label>
            <input
              id="campaign-name"
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. May 2026 reminder"
              className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label
              htmlFor="campaign-subject"
              className="mb-1 block text-xs font-semibold text-on-surface-variant"
            >
              Subject
            </label>
            <input
              id="campaign-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label
              htmlFor="campaign-body"
              className="mb-1 block text-xs font-semibold text-on-surface-variant"
            >
              HTML body
            </label>
            <textarea
              id="campaign-body"
              rows={10}
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              placeholder="<p>Hi {{name}},</p><p>...</p>"
              className="w-full resize-y rounded-lg bg-surface-container-low px-3 py-2 font-mono text-xs text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </section>

      {/* Confirm + send */}
      <section className="rounded-lg bg-surface-container-lowest p-5 shadow-ambient">
        <p className="text-sm font-semibold text-primary">Confirm and send</p>
        <p className="mt-1 flex items-start gap-2 text-xs text-on-surface-variant">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          Once sent, emails cannot be recalled. Each send creates a{' '}
          <code className="ml-1">marketing_email_sent</code> event on the recipient&apos;s application.
        </p>

        <div className="mt-4">
          <label
            htmlFor="confirm-text"
            className="mb-1 block text-xs font-semibold text-on-surface-variant"
          >
            Type{' '}
            <code className="rounded bg-surface-container-low px-1 py-0.5 text-xs">
              SEND {previewCount ?? '<count>'}
            </code>{' '}
            to confirm
          </label>
          <input
            id="confirm-text"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={!previewCount}
            className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm font-mono text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
        {result && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
            Sent {result.sent} of {result.total}. {result.failed > 0 && `${result.failed} failed.`}
          </p>
        )}

        <button
          type="button"
          onClick={sendCampaign}
          disabled={
            sending || !previewCount || !subject.trim() || !htmlBody.trim() || !confirmText.trim()
          }
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-secondary disabled:opacity-50"
        >
          <Send size={15} />
          {sending ? 'Sending…' : 'Send campaign'}
        </button>
      </section>
    </div>
  );
}
