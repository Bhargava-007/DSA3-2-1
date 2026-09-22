import { useState, useEffect, useCallback } from 'react';
import { api, type EntityCluster } from '../lib/api';
import { useCache } from '../context/CacheContext';

export function useEntities(runId?: number, page = 0, size = 100) {
  const { cache, getCachedForRun } = useCache();
  const cachedEntry = runId ? cache.entities[String(runId)] : null;
  const initialData = cachedEntry?.data || [];

  const [entities, setEntities] = useState<EntityCluster[]>(initialData);
  const [totalElements, setTotalElements] = useState<number>(initialData.length);
  const [totalPages, setTotalPages] = useState<number>(initialData.length > 0 ? 1 : 0);
  const [loading, setLoading] = useState<boolean>(() => {
    if (!runId) return false;
    return !cache.entities[String(runId)]?.data;
  });
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = useCallback(
    async (forceRefresh = false) => {
      if (!runId) {
        setEntities([]);
        setLoading(false);
        return;
      }

      const hasCached = !!cache.entities[String(runId)]?.data;
      if (!hasCached || forceRefresh) {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await getCachedForRun<EntityCluster[]>(
          'entities',
          runId,
          async () => {
            const apiRes = await api.getEntities(runId, page, size);
            return apiRes?.content || [];
          },
          { forceRefresh }
        );
        const dataList = res || [];
        setEntities(dataList);
        setTotalElements(dataList.length);
        setTotalPages(dataList.length > 0 ? 1 : 0);
      } catch (err: any) {
        setError(err?.message || 'Could not load data. Check that the backend is running on port 8080.');
      } finally {
        setLoading(false);
      }
    },
    [runId, page, size, getCachedForRun]
  );

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  useEffect(() => {
    if (runId && cache.entities[String(runId)]?.data) {
      const current = cache.entities[String(runId)]!.data!;
      setEntities(current);
      setTotalElements(current.length);
      setTotalPages(current.length > 0 ? 1 : 0);
      setLoading(false);
    }
  }, [runId, cache.entities]);

  const refetch = useCallback(() => fetchEntities(true), [fetchEntities]);

  return { entities, totalElements, totalPages, loading, error, refetch };
}
