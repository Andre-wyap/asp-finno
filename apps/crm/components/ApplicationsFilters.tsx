'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'applied', label: 'Applied' },
  { value: 'paid', label: 'Paid' },
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'issued', label: 'Issued' },
  { value: 'drop', label: 'Drop' }
];

const FIELD_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'orderId', label: 'Order ID' }
];

export function ApplicationsFilters({
  currentStatus,
  currentSearch,
  currentSearchField,
  currentArchive
}: {
  currentStatus: string;
  currentSearch: string;
  currentSearchField: string;
  currentArchive: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [searchField, setSearchField] = useState(currentSearchField);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (currentStatus) params.set('status', currentStatus);
    if (currentArchive && currentArchive !== 'active') params.set('archive', currentArchive);
    if (search.trim()) {
      params.set('search', search.trim());
      params.set('searchField', searchField);
    }
    router.push(`/applications?${params.toString()}`);
  }

  function handleStatusChange(value: string) {
    const params = new URLSearchParams();
    if (value) params.set('status', value);
    if (currentArchive && currentArchive !== 'active') params.set('archive', currentArchive);
    if (search.trim()) {
      params.set('search', search.trim());
      params.set('searchField', searchField);
    }
    router.push(`/applications?${params.toString()}`);
  }

  function handleArchiveChange(value: string) {
    const params = new URLSearchParams();
    if (currentStatus) params.set('status', currentStatus);
    if (value && value !== 'active') params.set('archive', value);
    if (search.trim()) {
      params.set('search', search.trim());
      params.set('searchField', searchField);
    }
    router.push(`/applications?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      {/* Status filter */}
      <select
        value={currentStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="rounded-full border-0 bg-surface-container-high px-4 py-2.5 text-sm font-semibold text-on-surface focus:ring-2 focus:ring-primary/30"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={currentArchive}
        onChange={(e) => handleArchiveChange(e.target.value)}
        className="rounded-full border-0 bg-surface-container-high px-4 py-2.5 text-sm font-semibold text-on-surface focus:ring-2 focus:ring-primary/30"
      >
        <option value="active">Active</option>
        <option value="archived">Archived</option>
        <option value="all">Active + archived</option>
      </select>

      {/* Search field selector + input */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value)}
          className="rounded-full border-0 bg-surface-container-high px-3 py-2.5 text-sm text-on-surface-variant focus:ring-2 focus:ring-primary/30"
        >
          {FIELD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="rounded-full bg-surface-container-high py-2.5 pl-9 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-secondary"
        >
          Go
        </button>
      </form>
    </div>
  );
}
