'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function MetaPixelPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const didTrackInitialPageView = useRef(false);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    if (!didTrackInitialPageView.current) {
      didTrackInitialPageView.current = true;
      return;
    }

    window.fbq?.('track', 'PageView');
  }, [pathname, search]);

  return null;
}
