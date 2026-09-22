import { useState, useEffect, useCallback } from 'react';
import { api, type PipelineRun } from '../lib/api';
import { useCache } from '../context/CacheContext';

export function usePipelineRuns() {
  const { cache, getCached } = useCache();
  const [runs, setRuns] = useState<PipelineRun[]>(() => cache.runs.data || []);
  const [loading, setLoading] = useState<boolean>(() => cache.runs.data === null);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(
    async (forceRefresh = false) => {
      if (cache.runs.data === null || forceRefresh) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await getCached<PipelineRun[]>('runs', () => api.getPipelineRuns(), { forceRefresh });
        setRuns(Array.isArray(res) ? res : []);
      } catch (err: any) {
        setError(err?.message || 'Could not load data. Check that the backend is running on port 8080.');
      } finally {
        setLoading(false);
      }
    },
    [getCached]
  );

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    if (cache.runs.data !== null) {
      setRuns(cache.runs.data);
      setLoading(false);
    }
  }, [cache.runs.data]);

  const refetch = useCallback(() => fetchRuns(true), [fetchRuns]);

  return { runs, loading, error, refetch };
}
