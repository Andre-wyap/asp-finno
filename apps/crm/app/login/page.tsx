'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { getClientAuth, GoogleAuthProvider } from '../../lib/firebaseClient';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);

    try {
      const auth = getClientAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? 'Sign-in failed. Ensure your account has admin access.');
        await auth.signOut();
        return;
      }

      const from = searchParams.get('from') ?? '/applications';
      router.push(from);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('popup-closed') || message.includes('cancelled')) {
        setError(null);
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-lg bg-surface-container-lowest p-8 shadow-ambient">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
            Admin Portal
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-primary">
            Allianz Shield Plus
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Sign in with your authorised Google account to continue.
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition hover:bg-secondary disabled:opacity-60"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <GoogleIcon />
            )}
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-on-surface-variant">
          Access is restricted to authorised administrators only.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
