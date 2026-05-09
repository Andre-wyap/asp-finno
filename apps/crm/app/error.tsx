'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('crm_render_error', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-2xl rounded-lg bg-surface-container-lowest p-8 shadow-ambient">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
          Server Error
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-primary">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-on-surface-variant">{error.message}</p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-on-surface-variant/70">
            Digest: {error.digest}
          </p>
        )}
        {error.stack && (
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-surface-container-low p-3 text-xs text-on-surface-variant">
            {error.stack}
          </pre>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-secondary"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
