import { useState, useEffect, useCallback } from 'react';
import { api, type CandidatePair } from '../lib/api';
import { useCache } from '../context/CacheContext';

export function usePairs(runId?: number, minScore = 0.45, page = 0, size = 100) {
  const { cache, getCachedForRun } = useCache();
  const cachedEntry = runId ? cache.matches[String(runId)] : null;
  const initialData = cachedEntry?.data || [];

  const [pairs, setPairs] = useState<CandidatePair[]>(initialData);
  const [totalElements, setTotalElements] = useState<number>(initialData.length);
  const [totalPages, setTotalPages] = useState<number>(initialData.length > 0 ? 1 : 0);
  const [loading, setLoading] = useState<boolean>(() => {
    if (!runId) return false;
    return !cache.matches[String(runId)]?.data;
  });
  const [error, setError] = useState<string | null>(null);

  const fetchPairs = useCallback(
    async (forceRefresh = false) => {
      if (!runId) {
        setPairs([]);
        setLoading(false);
        return;
      }

      const hasCached = !!cache.matches[String(runId)]?.data;
      if (!hasCached || forceRefresh) {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await getCachedForRun<CandidatePair[]>(
          'matches',
          runId,
          async () => {
            const apiRes = await api.getPairs(runId, minScore, page, size);
            return apiRes?.content || [];
          },
          { forceRefresh }
        );
        const dataList = res || [];
        setPairs(dataList);
        setTotalElements(dataList.length);
        setTotalPages(dataList.length > 0 ? 1 : 0);
      } catch (err: any) {
        setError(err?.message || 'Could not load data. Check that the backend is running on port 8080.');
      } finally {
        setLoading(false);
      }
    },
    [runId, minScore, page, size, getCachedForRun]
  );

  useEffect(() => {
    fetchPairs();
  }, [fetchPairs]);

  useEffect(() => {
    if (runId && cache.matches[String(runId)]?.data) {
      const current = cache.matches[String(runId)]!.data!;
      setPairs(current);
      setTotalElements(current.length);
      setTotalPages(current.length > 0 ? 1 : 0);
      setLoading(false);
    }
  }, [runId, cache.matches]);

  const refetch = useCallback(() => fetchPairs(true), [fetchPairs]);

  return { pairs, totalElements, totalPages, loading, error, refetch };
}
