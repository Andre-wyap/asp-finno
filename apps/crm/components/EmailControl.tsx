'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, RefreshCw, Send } from 'lucide-react';

type TemplateKey = 'lead_reminder' | 'paid' | 'payment_failed' | 'issued';

const TEMPLATES: { value: TemplateKey; label: string }[] = [
  { value: 'lead_reminder', label: 'Lead reminder' },
  { value: 'paid', label: 'Payment confirmed' },
  { value: 'payment_failed', label: 'Payment failed' },
  { value: 'issued', label: 'Policy issued' }
];

type ApiError = {
  error?: string;
};

async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as ApiError;
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function EmailControl({
  orderId,
  applicantEmail,
  currentStatus
}: {
  orderId: string;
  applicantEmail?: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateKey>(
    currentStatus === 'payment_failed' ? 'payment_failed' : currentStatus === 'issued' ? 'issued' : 'paid'
  );
  const [previewHtml, setPreviewHtml] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [cc, setCc] = useState('');
  const [loading, setLoading] = useState<'preview' | 'resend' | 'custom' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function previewTemplate() {
    setLoading('preview');
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/crm/applications/${orderId}/email/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template })
      });

      if (!response.ok) {
        setError(await readApiError(response, 'Unable to render preview.'));
        return;
      }

      const data = (await response.json()) as { html?: string };
      setPreviewHtml(data.html ?? '');
      setMessage('Preview rendered.');
    } catch {
      setError('Network error while rendering preview.');
    } finally {
      setLoading(null);
    }
  }

  async function resendTemplate() {
    setLoading('resend');
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/crm/applications/${orderId}/email/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template })
      });

      if (!response.ok) {
        setError(await readApiError(response, 'Unable to send template.'));
        return;
      }

      setMessage('Template email sent.');
      router.refresh();
    } catch {
      setError('Network error while sending template.');
    } finally {
      setLoading(null);
    }
  }

  async function sendCustomEmail(event: React.FormEvent) {
    event.preventDefault();
    const cleanSubject = subject.trim();
    const cleanBody = body.trim();

    if (!cleanSubject || !cleanBody) {
      setError('Subject and body are required.');
      return;
    }

    setLoading('custom');
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/crm/applications/${orderId}/email/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: cleanSubject,
          body: cleanBody,
          cc: cc
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        })
      });

      if (!response.ok) {
        setError(await readApiError(response, 'Unable to send custom email.'));
        return;
      }

      setSubject('');
      setBody('');
      setCc('');
      setMessage('Custom email sent.');
      router.refresh();
    } catch {
      setError('Network error while sending custom email.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-lg bg-surface-container-lowest shadow-ambient">
      <div className="border-b border-outline-variant/10 px-5 py-4">
        <p className="text-sm font-semibold text-primary">Email</p>
        <p className="mt-1 break-all text-xs text-on-surface-variant">
          {applicantEmail || 'No applicant email recorded'}
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
            {message}
          </p>
        )}

        <div>
          <label htmlFor="email-template" className="mb-1 block text-xs font-semibold text-on-surface-variant">
            Transactional template
          </label>
          <select
            id="email-template"
            value={template}
            onChange={(event) => {
              setTemplate(event.target.value as TemplateKey);
              setPreviewHtml('');
              setError(null);
              setMessage(null);
            }}
            className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {TEMPLATES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <button
            type="button"
            onClick={previewTemplate}
            disabled={loading !== null}
            className="flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary-fixed/40 px-4 text-sm font-semibold text-primary transition hover:bg-primary-fixed disabled:opacity-50"
          >
            <Eye size={15} />
            {loading === 'preview' ? 'Rendering...' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={resendTemplate}
            disabled={loading !== null || !applicantEmail}
            className="flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw size={15} />
            {loading === 'resend' ? 'Sending...' : 'Resend'}
          </button>
        </div>

        {previewHtml && (
          <div className="overflow-hidden rounded-lg border border-outline-variant/30 bg-white">
            <iframe
              title="Email template preview"
              srcDoc={previewHtml}
              className="h-[420px] w-full bg-white"
              sandbox=""
            />
          </div>
        )}

        <form onSubmit={sendCustomEmail} className="space-y-3 border-t border-outline-variant/10 pt-4">
          <div>
            <label htmlFor="custom-subject" className="mb-1 block text-xs font-semibold text-on-surface-variant">
              Custom subject
            </label>
            <input
              id="custom-subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label htmlFor="custom-body" className="mb-1 block text-xs font-semibold text-on-surface-variant">
              Custom HTML body
            </label>
            <textarea
              id="custom-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              className="w-full resize-none rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label htmlFor="custom-cc" className="mb-1 block text-xs font-semibold text-on-surface-variant">
              CC
            </label>
            <input
              id="custom-cc"
              type="text"
              value={cc}
              onChange={(event) => setCc(event.target.value)}
              placeholder="Separate multiple emails with commas"
              className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading !== null || !applicantEmail || !subject.trim() || !body.trim()}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-secondary disabled:opacity-50"
          >
            <Send size={15} />
            {loading === 'custom' ? 'Sending...' : 'Send custom email'}
          </button>
        </form>
      </div>
    </section>
  );
}
