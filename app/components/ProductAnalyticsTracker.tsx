'use client';

import {
  useEffect,
} from 'react';
import {
  usePathname,
} from 'next/navigation';

import {
  trackProductEvent,
} from '../../lib/productAnalytics';

export default function ProductAnalyticsTracker() {
  const pathname =
    usePathname();

  useEffect(() => {
    if (
      !pathname ||
      pathname.startsWith(
        '/admin',
      )
    ) {
      return;
    }

    void trackProductEvent(
      'page_view',
      {
        page: pathname,
      },
    );

    if (pathname === '/') {
      void trackProductEvent(
        'landing_view',
      );
    }

    if (
      pathname === '/signup'
    ) {
      void trackProductEvent(
        'signup_view',
      );
    }

    if (
      pathname ===
      '/onboarding'
    ) {
      void trackProductEvent(
        'onboarding_view',
      );
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname !== '/') {
      return;
    }

    function onClick(
      event: MouseEvent,
    ) {
      const target =
        event.target;

      if (
        !(target instanceof Element)
      ) {
        return;
      }

      const anchor =
        target.closest('a');

      if (!anchor) return;

      const href =
        anchor.getAttribute(
          'href',
        );

      if (href === '/signup') {
        void trackProductEvent(
          'signup_cta_click',
          {
            source:
              anchor.textContent
                ?.trim()
                .slice(0, 80) ||
              'landing',
          },
        );
      }
    }

    document.addEventListener(
      'click',
      onClick,
      true,
    );

    return () =>
      document.removeEventListener(
        'click',
        onClick,
        true,
      );
  }, [pathname]);

  return null;
}
