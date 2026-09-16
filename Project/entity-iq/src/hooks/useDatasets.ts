import { useState, useEffect, useCallback } from 'react';
import { api, type Dataset } from '../lib/api';
import { useCache } from '../context/CacheContext';

export function useDatasets() {
  const { cache, getCached } = useCache();
  const [datasets, setDatasets] = useState<Dataset[]>(() => cache.datasets.data || []);
  const [loading, setLoading] = useState<boolean>(() => cache.datasets.data === null);
  const [error, setError] = useState<string | null>(null);

  const fetchDatasets = useCallback(
    async (forceRefresh = false) => {
      if (cache.datasets.data === null || forceRefresh) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await getCached<Dataset[]>('datasets', () => api.getDatasets(), { forceRefresh });
        setDatasets(Array.isArray(res) ? res : []);
      } catch (err: any) {
        setError(err?.message || 'Could not load data. Check that the backend is running on port 8080.');
      } finally {
        setLoading(false);
      }
    },
    [getCached]
  );

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  useEffect(() => {
    if (cache.datasets.data !== null) {
      setDatasets(cache.datasets.data);
      setLoading(false);
    }
  }, [cache.datasets.data]);

  const refetch = useCallback(() => fetchDatasets(true), [fetchDatasets]);

  return { datasets, setDatasets, loading, error, refetch };
}
