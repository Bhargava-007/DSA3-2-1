import { useState, useEffect, useCallback } from 'react';
import { api, type StatsOverview } from '../lib/api';
import { useCache } from '../context/CacheContext';

export function useOverviewStats() {
  const { cache, getCached } = useCache();
  const [data, setData] = useState<StatsOverview | null>(() => cache.stats.data);
  const [loading, setLoading] = useState<boolean>(() => cache.stats.data === null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(
    async (forceRefresh = false) => {
      if (cache.stats.data === null || forceRefresh) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await getCached<StatsOverview>('stats', () => api.getOverview(), { forceRefresh });
        setData(res);
      } catch (err: any) {
        setError(err?.message || 'Could not load data. Check that the backend is running on port 8080.');
      } finally {
        setLoading(false);
      }
    },
    [getCached]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (cache.stats.data !== null) {
      setData(cache.stats.data);
      setLoading(false);
    }
  }, [cache.stats.data]);

  const refetch = useCallback(() => fetchStats(true), [fetchStats]);

  return { data, loading, error, refetch };
}
