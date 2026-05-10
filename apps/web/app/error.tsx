'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('web_render_error', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 text-on-surface">
      <section className="w-full max-w-xl rounded-lg bg-surface-container-lowest p-8 shadow-ambient">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-700">
          <AlertTriangle size={24} />
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold text-primary">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          The page could not be loaded. Please try again, or contact support if the problem
          continues.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-on-surface-variant">
            Error digest: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-on-primary hover:bg-secondary"
        >
          <RotateCcw size={16} />
          Try again
        </button>
      </section>
    </main>
  );
}
