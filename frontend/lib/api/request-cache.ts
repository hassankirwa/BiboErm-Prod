type CacheEntry = {
  data: unknown;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

export function buildCacheKey(method: string, url: string): string {
  return `${method.toUpperCase()}:${url}`;
}

export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number; skipCache?: boolean },
): Promise<T> {
  const ttlMs = options?.ttlMs ?? 30_000;

  if (!options?.skipCache) {
    const cached = memoryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = fetcher()
    .then((data) => {
      if (!options?.skipCache) {
        memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
      }
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/** Drop cached GET responses (exact key or prefix match). */
export function invalidateApiCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    memoryCache.clear();
    return;
  }

  for (const key of memoryCache.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      memoryCache.delete(key);
    }
  }
}
