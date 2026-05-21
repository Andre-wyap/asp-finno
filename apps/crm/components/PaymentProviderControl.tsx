'use client';

import { CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';

type PaymentProvider = 'senangpay' | 'doku';

const PROVIDERS: Array<{ value: PaymentProvider; label: string }> = [
  { value: 'doku', label: 'DOKU' },
  { value: 'senangpay', label: 'Senang Pay' }
];

export function PaymentProviderControl({
  initialProvider
}: {
  initialProvider: PaymentProvider;
}) {
  const [provider, setProvider] = useState<PaymentProvider>(initialProvider);
  const [savingProvider, setSavingProvider] = useState<PaymentProvider | null>(null);
  const [error, setError] = useState('');

  async function updateProvider(nextProvider: PaymentProvider) {
    if (nextProvider === provider || savingProvider) return;

    const confirmed = window.confirm(
      `Switch checkout payments to ${nextProvider === 'doku' ? 'DOKU' : 'Senang Pay'}?`
    );
    if (!confirmed) return;

    setSavingProvider(nextProvider);
    setError('');

    try {
      const response = await fetch('/api/crm/settings/payment-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeProvider: nextProvider })
      });
      const data = (await response.json().catch(() => ({}))) as {
        activeProvider?: PaymentProvider;
        error?: string;
      };

      if (!response.ok || !data.activeProvider) {
        throw new Error(data.error ?? 'Unable to update payment provider');
      }

      setProvider(data.activeProvider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update payment provider');
    } finally {
      setSavingProvider(null);
    }
  }

  return (
    <section className="rounded-lg bg-surface-container-lowest shadow-ambient">
      <div className="border-b border-outline-variant/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <CreditCard size={17} className="text-secondary" />
          <p className="text-sm font-semibold text-primary">Payment Provider</p>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="inline-flex rounded-lg bg-surface-container p-1">
          {PROVIDERS.map((item) => {
            const active = provider === item.value;
            const saving = savingProvider === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => updateProvider(item.value)}
                disabled={Boolean(savingProvider)}
                className={`flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
                  active
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-primary-fixed/40 hover:text-primary'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-on-surface-variant">
          Active checkout provider:{' '}
          <span className="font-semibold text-primary">
            {provider === 'doku' ? 'DOKU' : 'Senang Pay'}
          </span>
        </p>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </section>
  );
}
