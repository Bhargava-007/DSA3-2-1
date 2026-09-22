import { useState, useEffect, useRef } from 'react';
import { api, type PipelineStatus } from '../lib/api';

export function usePipelineStatus(id: number | null | undefined, onComplete?: () => void) {
  const [statusData, setStatusData] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const lastIdRef = useRef<number | null | undefined>(id);

  useEffect(() => {
    if (lastIdRef.current !== id) {
      lastIdRef.current = id;
      setStatusData(null);
    }

    if (!id) {
      return;
    }

    let intervalId: any = null;
    let isCancelled = false;

    const poll = async () => {
      try {
        const res = await api.getPipelineStatus(id);
        if (isCancelled) return;
        setStatusData(res);
        setError(null);

        if (res.status === 'COMPLETE' || res.status === 'FAILED') {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || 'Could not poll pipeline status.');
        }
      }
    };

    poll();
    intervalId = setInterval(poll, 800);

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [id]);

  return {
    status: statusData?.status,
    stage: statusData?.stage,
    progressPct: statusData?.progressPct ?? (statusData?.status === 'COMPLETE' ? 100 : 0),
    statusData,
    error,
  };
}
