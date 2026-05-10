'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Tag, X } from 'lucide-react';

type Promo = {
  code: string;
  discountType: 'percent' | 'fixed';
  value: number;
  active: boolean;
  validFrom: number | null;
  validUntil: number | null;
  usageLimit: number | null;
  usageCount: number;
  allowedPlans: string[];
  allowedCategories: string[];
  notes: string | null;
  createdAt: number | null;
};

const CATEGORIES = [
  { value: 'A', label: 'Category A' },
  { value: 'B', label: 'Category B' }
];

function fmtDate(ms: number | null) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function isoDateInput(ms: number | null | undefined) {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}

export function PromoCodesPanel({
  planOptions
}: {
  planOptions: { code: string; name: string }[];
}) {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/promo-codes');
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Unable to load promo codes.');
        return;
      }
      const data = (await res.json()) as { promos: Promo[] };
      setPromos(data.promos);
    } catch {
      setError('Network error while loading.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-variant">{promos.length} promo codes</p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-secondary"
        >
          <Plus size={15} />
          New code
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading…</p>
      ) : promos.length === 0 ? (
        <div className="rounded-lg bg-surface-container-lowest p-10 text-center text-sm text-on-surface-variant shadow-ambient">
          <Tag size={28} className="mx-auto mb-3 text-on-surface-variant" />
          No promo codes yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-ambient">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low text-left text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Validity</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <PromoRow
                  key={p.code}
                  promo={p}
                  planOptions={planOptions}
                  onChanged={load}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreatePromoModal
          planOptions={planOptions}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function PromoRow({
  promo,
  planOptions,
  onChanged
}: {
  promo: Promo;
  planOptions: { code: string; name: string }[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);

  async function toggleActive() {
    await fetch(`/api/crm/promo-codes/${promo.code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !promo.active })
    });
    onChanged();
  }

  async function deactivate() {
    if (!confirm(`Deactivate promo code "${promo.code}"?`)) return;
    await fetch(`/api/crm/promo-codes/${promo.code}`, { method: 'DELETE' });
    onChanged();
  }

  const planLabel =
    promo.allowedPlans.length === 0
      ? 'All plans'
      : promo.allowedPlans
          .map((c) => planOptions.find((p) => p.code === c)?.name ?? c)
          .join(', ');
  const catLabel =
    promo.allowedCategories.length === 0
      ? 'All categories'
      : promo.allowedCategories.map((c) => `Cat ${c}`).join(', ');

  return (
    <>
      <tr className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-low/50">
        <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{promo.code}</td>
        <td className="px-4 py-3 text-on-surface-variant">
          {promo.discountType === 'percent' ? `${promo.value}% off` : `RM ${promo.value} off`}
        </td>
        <td className="px-4 py-3 text-xs text-on-surface-variant">
          {fmtDate(promo.validFrom)} → {fmtDate(promo.validUntil)}
        </td>
        <td className="px-4 py-3 text-xs text-on-surface-variant">
          {promo.usageCount}
          {promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={toggleActive}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              promo.active ? 'bg-green-50 text-green-700' : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {promo.active ? 'Active' : 'Inactive'}
          </button>
        </td>
        <td className="px-4 py-3 text-right text-xs">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-full bg-primary-fixed/40 px-3 py-1.5 font-semibold text-primary hover:bg-primary-fixed"
          >
            {editing ? 'Close' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={deactivate}
            className="ml-2 rounded-full bg-surface-container px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50"
          >
            <Trash2 size={13} />
          </button>
        </td>
      </tr>
      {editing && (
        <tr className="bg-surface-container-low/50">
          <td colSpan={6} className="px-4 py-4">
            <EditPromoForm
              promo={promo}
              planOptions={planOptions}
              onSaved={() => {
                setEditing(false);
                onChanged();
              }}
            />
          </td>
        </tr>
      )}
      {!editing && (
        <tr className="border-b border-outline-variant/10 last:border-0 text-xs text-on-surface-variant">
          <td colSpan={6} className="px-4 pb-3 -mt-1">
            <span className="rounded bg-surface-container-low px-1.5 py-0.5">{planLabel}</span>
            <span className="ml-2 rounded bg-surface-container-low px-1.5 py-0.5">{catLabel}</span>
            {promo.notes && <span className="ml-2 italic">{promo.notes}</span>}
          </td>
        </tr>
      )}
    </>
  );
}

type FormState = {
  discountType: 'percent' | 'fixed';
  value: string;
  validFrom: string;
  validUntil: string;
  usageLimit: string;
  allowedPlans: string[];
  allowedCategories: string[];
  notes: string;
};

function CreatePromoModal({
  planOptions,
  onClose,
  onCreated
}: {
  planOptions: { code: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState('');
  const [form, setForm] = useState<FormState>({
    discountType: 'percent',
    value: '10',
    validFrom: '',
    validUntil: '',
    usageLimit: '',
    allowedPlans: [],
    allowedCategories: [],
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          discountType: form.discountType,
          value: Number(form.value),
          active: true,
          validFrom: form.validFrom || null,
          validUntil: form.validUntil || null,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          allowedPlans: form.allowedPlans,
          allowedCategories: form.allowedCategories,
          notes: form.notes.trim() || null
        })
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Unable to create promo code.');
        return;
      }
      onCreated();
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-surface-container-lowest p-6 shadow-ambient">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-xl font-semibold text-primary">New promo code</p>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="new-code" className="mb-1 block text-xs font-semibold text-on-surface-variant">
              Code
            </label>
            <input
              id="new-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="WELCOME10"
              className="w-full rounded-lg bg-surface-container-low px-3 py-2 font-mono text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <PromoFormFields form={form} setForm={setForm} planOptions={planOptions} />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-surface-container px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || !code.trim() || !form.value}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-secondary disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditPromoForm({
  promo,
  planOptions,
  onSaved
}: {
  promo: Promo;
  planOptions: { code: string; name: string }[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    discountType: promo.discountType,
    value: String(promo.value),
    validFrom: isoDateInput(promo.validFrom),
    validUntil: isoDateInput(promo.validUntil),
    usageLimit: promo.usageLimit ? String(promo.usageLimit) : '',
    allowedPlans: promo.allowedPlans,
    allowedCategories: promo.allowedCategories,
    notes: promo.notes ?? ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/promo-codes/${promo.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountType: form.discountType,
          value: Number(form.value),
          validFrom: form.validFrom || null,
          validUntil: form.validUntil || null,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          allowedPlans: form.allowedPlans,
          allowedCategories: form.allowedCategories,
          notes: form.notes.trim() || null
        })
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Unable to save.');
        return;
      }
      onSaved();
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PromoFormFields form={form} setForm={setForm} planOptions={planOptions} />
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>
      )}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-secondary disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function PromoFormFields({
  form,
  setForm,
  planOptions
}: {
  form: FormState;
  setForm: (next: FormState) => void;
  planOptions: { code: string; name: string }[];
}) {
  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm({ ...form, [field]: value });
  }
  function toggle<K extends 'allowedPlans' | 'allowedCategories'>(field: K, v: string) {
    const list = form[field];
    update(field, (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]) as FormState[K]);
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
            Discount type
          </label>
          <select
            value={form.discountType}
            onChange={(e) =>
              update('discountType', e.target.value as 'percent' | 'fixed')
            }
            className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed RM off</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
            Value {form.discountType === 'percent' ? '(%)' : '(RM)'}
          </label>
          <input
            type="number"
            min="0"
            value={form.value}
            onChange={(e) => update('value', e.target.value)}
            className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-on-surface-variant">Valid from</label>
          <input
            type="date"
            value={form.validFrom}
            onChange={(e) => update('validFrom', e.target.value)}
            className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-on-surface-variant">Valid until</label>
          <input
            type="date"
            value={form.validUntil}
            onChange={(e) => update('validUntil', e.target.value)}
            className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-on-surface-variant">Usage limit</label>
          <input
            type="number"
            min="0"
            value={form.usageLimit}
            onChange={(e) => update('usageLimit', e.target.value)}
            placeholder="Unlimited"
            className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold text-on-surface-variant">
          Allowed plans (none selected = all plans)
        </p>
        <div className="flex flex-wrap gap-2">
          {planOptions.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => toggle('allowedPlans', p.code)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                form.allowedPlans.includes(p.code)
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-primary-fixed/40'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold text-on-surface-variant">
          Allowed categories (none = all)
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => toggle('allowedCategories', c.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                form.allowedCategories.includes(c.value)
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-primary-fixed/40'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-semibold text-on-surface-variant">Notes</label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Internal note for admins"
          className="w-full rounded-lg bg-surface-container-low px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </>
  );
}
