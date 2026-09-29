import React, { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react';
import type { Dataset, PipelineRun, EntityCluster, StatsOverview, CandidatePair } from '@/lib/api';

export type Stats = StatsOverview;
export type MatchPair = CandidatePair;

export const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export type CacheEntry<T> = {
  data: T | null;
  fetchedAt: number | null;
};

export type AppCache = {
  datasets: CacheEntry<Dataset[]>;
  runs: CacheEntry<PipelineRun[]>;
  entities: Record<string, CacheEntry<EntityCluster[]>>;
  stats: CacheEntry<StatsOverview>;
  matches: Record<string, CacheEntry<CandidatePair[]>>;
};

const createInitialCache = (): AppCache => ({
  datasets: { data: null, fetchedAt: null },
  runs: { data: null, fetchedAt: null },
  entities: {},
  stats: { data: null, fetchedAt: null },
  matches: {},
});

export interface CacheContextType {
  cache: AppCache;
  isBackgroundRefreshing: boolean;
  getCached: <T>(
    key: 'datasets' | 'runs' | 'stats',
    fetcher: () => Promise<T>,
    options?: { forceRefresh?: boolean }
  ) => Promise<T>;
  getCachedForRun: <T>(
    type: 'entities' | 'matches',
    runId: number | string,
    fetcher: () => Promise<T>,
    options?: { forceRefresh?: boolean }
  ) => Promise<T>;
  invalidate: (key: 'datasets' | 'runs' | 'stats' | 'entities' | 'matches') => void;
  invalidateRun: (runId: number | string) => void;
  invalidateAll: () => void;
}

const CacheContext = createContext<CacheContextType | null>(null);

export const CacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const cacheRef = useRef<AppCache>(createInitialCache());
  const [cache, setCache] = useState<AppCache>(cacheRef.current);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState<boolean>(false);
  const pendingRequests = useRef<Record<string, Promise<any>>>({});

  const updateCacheState = useCallback(() => {
    setCache({
      ...cacheRef.current,
      entities: { ...cacheRef.current.entities },
      matches: { ...cacheRef.current.matches },
    });
  }, []);

  const getCached = useCallback(
    async <T,>(
      key: 'datasets' | 'runs' | 'stats',
      fetcher: () => Promise<T>,
      options?: { forceRefresh?: boolean }
    ): Promise<T> => {
      const entry = cacheRef.current[key];
      const now = Date.now();
      const hasData = entry && entry.data !== null;
      const isFresh = hasData && entry.fetchedAt !== null && now - entry.fetchedAt < CACHE_TTL_MS;

      // 1. If fresh and not forcing refresh, return immediately from memory
      if (!options?.forceRefresh && isFresh) {
        return entry.data as unknown as T;
      }

      // 2. If stale but data exists, trigger silent background revalidation and return stale data instantly (Stale-While-Revalidate)
      if (!options?.forceRefresh && hasData) {
        if (!pendingRequests.current[key]) {
          setIsBackgroundRefreshing(true);
          const bgPromise = fetcher()
            .then((result) => {
              cacheRef.current[key] = {
                data: result as any,
                fetchedAt: Date.now(),
              };
              updateCacheState();
              return result;
            })
            .catch((err) => {
              console.warn(`[CACHE] Background revalidation failed for ${key}:`, err);
            })
            .finally(() => {
              delete pendingRequests.current[key];
              setIsBackgroundRefreshing(false);
            });

          pendingRequests.current[key] = bgPromise;
        }
        return entry.data as unknown as T;
      }

      // 3. If no cached data exists or forced refresh, fetch synchronously with in-flight deduplication
      if (Object.prototype.hasOwnProperty.call(pendingRequests.current, key)) {
        return pendingRequests.current[key] as Promise<T>;
      }

      const promise = (async () => {
        try {
          const result = await fetcher();
          cacheRef.current[key] = {
            data: result as any,
            fetchedAt: Date.now(),
          };
          updateCacheState();
          return result;
        } finally {
          delete pendingRequests.current[key];
        }
      })();

      pendingRequests.current[key] = promise;
      return promise;
    },
    [updateCacheState]
  );

  const getCachedForRun = useCallback(
    async <T,>(
      type: 'entities' | 'matches',
      runId: number | string,
      fetcher: () => Promise<T>,
      options?: { forceRefresh?: boolean }
    ): Promise<T> => {
      const idKey = String(runId);
      const group = cacheRef.current[type];
      const entry = group[idKey];
      const now = Date.now();
      const hasData = entry && entry.data !== null;
      const isFresh = hasData && entry.fetchedAt !== null && now - entry.fetchedAt < CACHE_TTL_MS;
      const reqKey = `${type}:${idKey}`;

      // 1. Fresh cache hit
      if (!options?.forceRefresh && isFresh) {
        return entry.data as unknown as T;
      }

      // 2. Stale-while-revalidate
      if (!options?.forceRefresh && hasData) {
        if (!pendingRequests.current[reqKey]) {
          setIsBackgroundRefreshing(true);
          const bgPromise = fetcher()
            .then((result) => {
              cacheRef.current[type][idKey] = {
                data: result as any,
                fetchedAt: Date.now(),
              };
              updateCacheState();
              return result;
            })
            .catch((err) => {
              console.warn(`[CACHE] Background revalidation failed for ${reqKey}:`, err);
            })
            .finally(() => {
              delete pendingRequests.current[reqKey];
              setIsBackgroundRefreshing(false);
            });

          pendingRequests.current[reqKey] = bgPromise;
        }
        return entry.data as unknown as T;
      }

      // 3. Cold fetch with deduplication
      if (Object.prototype.hasOwnProperty.call(pendingRequests.current, reqKey)) {
        return pendingRequests.current[reqKey] as Promise<T>;
      }

      const promise = (async () => {
        try {
          const result = await fetcher();
          cacheRef.current[type][idKey] = {
            data: result as any,
            fetchedAt: Date.now(),
          };
          updateCacheState();
          return result;
        } finally {
          delete pendingRequests.current[reqKey];
        }
      })();

      pendingRequests.current[reqKey] = promise;
      return promise;
    },
    [updateCacheState]
  );

  const invalidate = useCallback(
    (key: 'datasets' | 'runs' | 'stats' | 'entities' | 'matches') => {
      if (key === 'entities' || key === 'matches') {
        cacheRef.current[key] = {};
      } else {
        cacheRef.current[key] = { data: null, fetchedAt: null };
      }
      updateCacheState();
    },
    [updateCacheState]
  );

  const invalidateRun = useCallback(
    (runId: number | string) => {
      const idKey = String(runId);
      delete cacheRef.current.entities[idKey];
      delete cacheRef.current.matches[idKey];
      updateCacheState();
    },
    [updateCacheState]
  );

  const invalidateAll = useCallback(() => {
    cacheRef.current = createInitialCache();
    updateCacheState();
  }, [updateCacheState]);

  return (
    <CacheContext.Provider
      value={{
        cache,
        isBackgroundRefreshing,
        getCached,
        getCachedForRun,
        invalidate,
        invalidateRun,
        invalidateAll,
      }}
    >
      {children}
    </CacheContext.Provider>
  );
};

export const useCache = (): CacheContextType => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

