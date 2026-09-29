const BASE = '/api/v1';

export interface Dataset {
  id: number;
  datasetId?: number;
  filename: string;
  recordCount: number;
  fileSizeMb: number;
  status: 'UPLOADED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  uploadedAt: string;
  completedAt?: string;
}

export interface PipelineRun {
  id: number;
  datasetId?: number;
  datasetFilename?: string;
  scope?: string;
  datasetCount?: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED';
  stage: string;
  inputRecords: number;
  entitiesFormed: number;
  matchConfidence: number;
  comparisonReduction: number;
  durationMs: number;
  startedAt: string;
  completedAt?: string;
}

export interface PipelineStatus {
  runId: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED';
  stage: string;
  progressPct: number;
  message?: string;
}

export interface ClusterMember {
  productId: number;
  title: string;
  brand: string;
  source: string;
  price: number;
  externalId: string;
  category?: string;
  description?: string;
}

export interface EntityCluster {
  id: number;
  pipelineRunId: number;
  canonicalTitle: string;
  canonicalBrand: string;
  listingCount: number;
  sourceCount: number;
  confidence: number;
  members?: ClusterMember[];
}

export interface ProductDetail {
  id: number;
  externalId: string;
  title: string;
  description: string;
  brand: string;
  price: number;
  category: string;
  source: string;
}

export interface CandidatePair {
  id: number;
  productAId: number;
  productBId: number;
  productA?: ProductDetail;
  productB?: ProductDetail;
  titleSimilarity: number;
  descriptionJaccard: number;
  levenshteinDistance: number;
  brandMatch: boolean;
  modelMatch: boolean;
  finalScore: number;
  isMatch: boolean;
}

export interface StatsOverview {
  totalListings: number | null;
  totalResolvedEntities: number | null;
  averageMatchConfidence: number | null;
  averageComparisonReduction: number | null;
}

export interface AlgorithmStats {
  kmpPatternSearches: number;
  rabinKarpHashComparisons: number;
  levenshteinDpOperations: number;
  suffixArrayCandidateBlocks: number;
  unionFindClusterMerges: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
}

export interface SimilarityTestResult {
  kmp: number;
  rabinKarp: number;
  levenshtein: number;
  jaccard: number;
  weighted: number;
}

export const api = {

  // DATASETS
  uploadDataset: (file: File): Promise<Dataset> => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE}/datasets/upload`, { method: 'POST', body: form })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });
  },
  getDatasets: (): Promise<Dataset[]> =>
    fetch(`${BASE}/datasets`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  getDataset: (id: number): Promise<Dataset> =>
    fetch(`${BASE}/datasets/${id}`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  deleteDataset: (id: number): Promise<Response> =>
    fetch(`${BASE}/datasets/${id}`, { method: 'DELETE' }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    }),

  // PIPELINE
  runPipeline: (datasetId?: number): Promise<{ runId: number; status: string; message: string }> =>
    fetch(`${BASE}/pipeline/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datasetId ? { datasetId } : {})
    }).then(async r => {
      if (!r.ok) {
        let errMsg = `HTTP ${r.status}`;
        try {
          const body = await r.json();
          if (body?.error) errMsg = body.error;
          else if (body?.message) errMsg = body.message;
        } catch {}
        throw new Error(errMsg);
      }
      return r.json();
    }),
  getPipelineRuns: (): Promise<PipelineRun[]> =>
    fetch(`${BASE}/pipeline/runs`).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  getPipelineRun: (id: number): Promise<PipelineRun> =>
    fetch(`${BASE}/pipeline/runs/${id}`).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  getPipelineStatus: (id: number): Promise<PipelineStatus> =>
    fetch(`${BASE}/pipeline/runs/${id}/status`).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),

  // ENTITIES
  getEntities: (runId?: number, page = 0, size = 50): Promise<PaginatedResponse<EntityCluster>> => {
    const url = runId !== undefined && runId !== null
      ? `${BASE}/entities?runId=${runId}&page=${page}&size=${size}`
      : `${BASE}/entities?page=${page}&size=${size}`;
    return fetch(url).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  },
  getEntity: (id: number): Promise<EntityCluster> =>
    fetch(`${BASE}/entities/${id}`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),

  // MATCHES
  getPairs: (runId?: number, minScore = 0.75, page = 0, size = 50): Promise<PaginatedResponse<CandidatePair>> => {
    const url = runId !== undefined && runId !== null
      ? `${BASE}/matches/pairs?runId=${runId}&minScore=${minScore}&page=${page}&size=${size}`
      : `${BASE}/matches/pairs?minScore=${minScore}&page=${page}&size=${size}`;
    return fetch(url).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  },
  getPair: (id: number): Promise<CandidatePair> =>
    fetch(`${BASE}/matches/pairs/${id}`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),

  // SIMILARITY
  testSimilarity: (titleA: string, titleB: string): Promise<SimilarityTestResult> =>
    fetch(`${BASE}/similarity/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titleA, titleB })
    }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),

  // STATS
  getOverview: (): Promise<StatsOverview> =>
    fetch(`${BASE}/stats/overview`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  getAlgorithmStats: (): Promise<AlgorithmStats> =>
    fetch(`${BASE}/stats/algorithms`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),

  // EXPORT
  exportClusters: (runId: number) =>
    window.open(`${BASE}/export/clusters/${runId}`, '_blank'),
  exportPairs: (runId: number) =>
    window.open(`${BASE}/export/pairs/${runId}`, '_blank'),

  // ADMIN
  clearAllData: async (): Promise<{ status: string; message: string }> => {
    const res = await fetch('/api/admin/clear-all', {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errBody || 'Failed to clear data'}`);
    }
    return res.json();
  },
};
