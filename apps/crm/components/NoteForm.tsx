'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';

export function NoteForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/crm/applications/${orderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: text })
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to add note.');
        return;
      }

      setNote('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
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
        <p className="text-sm font-semibold text-primary">Add note</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setError(null);
          }}
          placeholder="Write a note for this application…"
          rows={3}
          className="w-full resize-none rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
            Note added.
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !note.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-fixed/40 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary-fixed disabled:opacity-50"
        >
          <MessageSquarePlus size={16} />
          {loading ? 'Saving…' : 'Save note'}
        </button>
      </form>
    </section>
  );
}
