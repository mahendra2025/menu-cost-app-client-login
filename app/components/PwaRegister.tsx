'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
      } catch {
        // The web app continues to work normally if PWA registration is unavailable.
      }
    };

    let timer = 0;
    const scheduleRegistration = () => {
      timer = window.setTimeout(() => void register(), 1200);
    };

    if (document.readyState === 'complete') {
      scheduleRegistration();
      return () => window.clearTimeout(timer);
    }

    window.addEventListener('load', scheduleRegistration, { once: true });
    return () => {
      window.removeEventListener('load', scheduleRegistration);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
