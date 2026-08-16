'use client';

import {
  useEffect,
} from 'react';
import {
  usePathname,
  useRouter,
} from 'next/navigation';

type CachedResponse = {
  savedAt: number;
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: string;
};

type FastWindow =
  Window &
  typeof globalThis & {
    __adminFastFetchV2?: boolean;
  };

const PREFIX =
  'admin_fast_cache_v5:';

const REFRESH_AFTER =
  20 * 1000;

const MAX_STALE =
  10 * 60 * 1000;

const MAX_STORAGE_BODY =
  1_500_000;

const memory =
  new Map<
    string,
    CachedResponse
  >();

const inFlight =
  new Map<
    string,
    Promise<CachedResponse>
  >();

const ADMIN_ROUTES = [
  '/admin/users',
  '/admin/dishes',
  '/admin/recipes',
  '/admin/ingredients',
];

const CRITICAL_APIS = [
  '/api/admin/dishes',
  '/api/admin/recipes',
  '/api/admin/recipes?mode=version',
];

function storageKey(
  key: string,
) {
  return `${PREFIX}${key}`;
}

function readCache(
  key: string,
) {
  const existing =
    memory.get(key);

  if (existing) {
    return existing;
  }

  try {
    const raw =
      sessionStorage.getItem(
        storageKey(key),
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(
        raw,
      ) as CachedResponse;

    if (
      !parsed ||
      typeof parsed.body !==
        'string' ||
      !Number.isFinite(
        parsed.savedAt,
      )
    ) {
      return null;
    }

    memory.set(
      key,
      parsed,
    );

    return parsed;
  } catch {
    return null;
  }
}

function saveCache(
  key: string,
  entry: CachedResponse,
) {
  memory.set(
    key,
    entry,
  );

  if (
    entry.body.length >
    MAX_STORAGE_BODY
  ) {
    return;
  }

  try {
    sessionStorage.setItem(
      storageKey(key),
      JSON.stringify(
        entry,
      ),
    );
  } catch {
    // Memory cache still works.
  }
}

function clearAdminCache() {
  memory.clear();

  try {
    for (
      let index =
        sessionStorage.length -
        1;
      index >= 0;
      index -= 1
    ) {
      const key =
        sessionStorage.key(
          index,
        );

      if (
        key?.startsWith(
          PREFIX,
        )
      ) {
        sessionStorage.removeItem(
          key,
        );
      }
    }
  } catch {
    // Cache cleanup is optional.
  }
}

function cacheKeyMatches(
  key: string,
  prefix: string,
) {
  return (
    key === prefix ||
    key.startsWith(
      `${prefix}?`,
    )
  );
}

function clearMatchingCache(
  prefixes: string[],
) {
  for (const key of [...memory.keys()]) {
    if (
      prefixes.some(
        (prefix) =>
          cacheKeyMatches(
            key,
            prefix,
          ),
      )
    ) {
      memory.delete(key);
    }
  }

  try {
    for (
      let index =
        sessionStorage.length - 1;
      index >= 0;
      index -= 1
    ) {
      const storedKey =
        sessionStorage.key(index);

      if (
        !storedKey?.startsWith(
          PREFIX,
        )
      ) {
        continue;
      }

      const requestKey =
        storedKey.slice(
          PREFIX.length,
        );

      if (
        prefixes.some(
          (prefix) =>
            cacheKeyMatches(
              requestKey,
              prefix,
            ),
        )
      ) {
        sessionStorage.removeItem(
          storedKey,
        );
      }
    }
  } catch {
    // Memory invalidation is enough.
  }
}

function mutationImpact(
  pathname: string,
) {
  if (
    pathname.startsWith(
      '/api/admin/recipes',
    )
  ) {
    return [
      '/api/admin/recipes',
      '/api/admin/dishes',
    ];
  }

  if (
    pathname.startsWith(
      '/api/admin/dishes',
    )
  ) {
    return [
      '/api/admin/dishes',
      '/api/admin/recipes',
    ];
  }

  if (
    pathname.startsWith(
      '/api/admin/ingredients',
    )
  ) {
    return [
      '/api/admin/ingredients',
      '/api/admin/recipes',
    ];
  }

  if (
    pathname.startsWith(
      '/api/admin/dish-suggestions',
    )
  ) {
    return [
      '/api/admin/dish-suggestions',
      '/api/admin/dishes',
      '/api/admin/recipes',
    ];
  }

  if (
    pathname.startsWith(
      '/api/admin/users',
    )
  ) {
    return [
      '/api/admin/users',
    ];
  }

  return [pathname];
}

function cachedResponse(
  entry: CachedResponse,
) {
  const bodyForbidden =
    [
      101,
      103,
      204,
      205,
      304,
    ].includes(
      entry.status,
    );

  return new Response(
    bodyForbidden
      ? null
      : entry.body,
    {
      status:
        entry.status,
      statusText:
        entry.statusText,
      headers:
        entry.headers,
    },
  );
}

function requestDetails(
  input:
    RequestInfo | URL,
  init?: RequestInit,
) {
  const raw =
    typeof input ===
    'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  let url: URL;

  try {
    url =
      new URL(
        raw,
        window.location.origin,
      );
  } catch {
    return null;
  }

  const requestMethod =
    input instanceof Request
      ? input.method
      : 'GET';

  const method =
    String(
      init?.method ||
      requestMethod ||
      'GET',
    ).toUpperCase();

  return {
    url,
    method,
    key:
      `${url.pathname}${url.search}`,
  };
}

function loadFromNetwork(
  nativeFetch:
    typeof window.fetch,
  input:
    RequestInfo | URL,
  init:
    RequestInit | undefined,
  key: string,
) {
  const existing =
    inFlight.get(key);

  if (existing) {
    return existing;
  }

  const promise =
    nativeFetch(
      input,
      init,
    )
      .then(
        async (
          response,
        ) => {
          const body =
            await response.text();

          const headers:
            Array<
              [
                string,
                string,
              ]
            > = [];

          response.headers.forEach(
            (
              value,
              name,
            ) => {
              headers.push([
                name,
                value,
              ]);
            },
          );

          const entry:
            CachedResponse = {
              savedAt:
                Date.now(),
              status:
                response.status,
              statusText:
                response.statusText,
              headers,
              body,
            };

          if (
            response.ok
          ) {
            saveCache(
              key,
              entry,
            );
          }

          return entry;
        },
      )
      .finally(() => {
        inFlight.delete(
          key,
        );
      });

  inFlight.set(
    key,
    promise,
  );

  return promise;
}

function installFastFetch() {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  const fastWindow =
    window as FastWindow;

  if (
    fastWindow
      .__adminFastFetchV2
  ) {
    return;
  }

  const nativeFetch =
    window.fetch.bind(
      window,
    );

  window.fetch =
    (async (
      input:
        RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const details =
        requestDetails(
          input,
          init,
        );

      if (!details) {
        return nativeFetch(
          input,
          init,
        );
      }

      const isAdminApi =
        details.url.origin ===
          window.location
            .origin &&
        details.url.pathname
          .startsWith(
            '/api/admin/',
          );

      if (!isAdminApi) {
        return nativeFetch(
          input,
          init,
        );
      }

      // Mutations always hit server,
      // then invalidate admin cache.
      if (
        details.method !==
        'GET'
      ) {
        const response =
          await nativeFetch(
            input,
            init,
          );

        if (
          response.ok
        ) {
          clearMatchingCache(
            mutationImpact(
              details.url.pathname,
            ),
          );
        }

        return response;
      }

      const cached =
        readCache(
          details.key,
        );

      const age =
        cached
          ? Date.now() -
            cached.savedAt
          : Infinity;

      if (
        cached &&
        age <= MAX_STALE
      ) {
        // Serve instantly.
        // Refresh quietly when needed.
        if (
          age >
          REFRESH_AFTER
        ) {
          void loadFromNetwork(
            nativeFetch,
            input,
            init,
            details.key,
          ).catch(
            () => {},
          );
        }

        return cachedResponse(
          cached,
        );
      }

      const entry =
        await loadFromNetwork(
          nativeFetch,
          input,
          init,
          details.key,
        );

      return cachedResponse(
        entry,
      );
    }) as typeof window.fetch;

  fastWindow
    .__adminFastFetchV2 =
    true;
}

function primeCriticalAdminData() {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  if (
    !window.location.pathname
      .startsWith('/admin')
  ) {
    return;
  }

  CRITICAL_APIS.forEach(
    (url) => {
      void window
        .fetch(
          url,
          {
            cache: 'no-store',
          },
        )
        .catch(() => {});
    },
  );
}

// Install before page useEffect
// API requests begin.
installFastFetch();
primeCriticalAdminData();

export default function AdminPerformanceBootstrap() {
  const router =
    useRouter();

  const pathname =
    usePathname();

  useEffect(() => {
    if (
      pathname === '/login'
    ) {
      clearAdminCache();
      return;
    }

    if (
      !pathname.startsWith(
        '/admin',
      )
    ) {
      return;
    }

    ADMIN_ROUTES.forEach(
      (route) => {
        router.prefetch(
          route,
        );
      },
    );

    const secondaryApi =
      pathname ===
        '/admin/ingredients'
        ? '/api/admin/ingredients'
        : pathname ===
            '/admin/users'
          ? '/api/admin/users'
          : null;

    if (!secondaryApi) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          void fetch(
            secondaryApi,
            {
              cache: 'no-store',
            },
          ).catch(
            () => {},
          );
        },
        150,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    pathname,
    router,
  ]);

  return null;
}
