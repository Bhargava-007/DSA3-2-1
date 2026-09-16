import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useOverviewStats } from '@/hooks/useOverviewStats'
import { usePipelineRuns } from '@/hooks/usePipelineRuns'
import { useDatasets } from '@/hooks/useDatasets'
import { useCache } from '@/context/CacheContext'
import { api } from '@/lib/api'
import { AlertTriangle } from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { invalidate, invalidateRun } = useCache()
  const { data: stats, loading: statsLoading } = useOverviewStats()
  const { runs, loading: runsLoading, error: runsError, refetch: refetchRuns } = usePipelineRuns()
  const { datasets, loading: datasetsLoading } = useDatasets()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [startingRun, setStartingRun] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const totalDatasetRecords = datasets.reduce((sum, d) => sum + (d.recordCount || 0), 0)
  const totalProductsInDb = stats?.totalListings || 0
  const hasRecordMismatch = datasets.length > 0 && totalProductsInDb > totalDatasetRecords

  const handleStartRun = async () => {
    if (datasets.length === 0) return
    setStartingRun(true)
    setModalError(null)
    try {
      const res = await api.runPipeline()
      setIsModalOpen(false)
      invalidate('runs')
      invalidate('datasets')
      invalidate('stats')
      if (res.runId) {
        invalidateRun(res.runId)
      }
      refetchRuns()
      navigate(`/pipeline?runId=${res.runId}`)
    } catch (err: any) {
      setModalError(err?.message || 'Failed to start pipeline run')
    } finally {
      setStartingRun(false)
    }
  }

  const latestCompletedRun = runs.find((r) => r.status === 'COMPLETE')

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-8 max-w-[1280px]">
      {/* Page Header */}
      <div>
        <h1 className="page-title">Overview</h1>
        <p className="page-subtitle">Product entity resolution and duplicate detection summary.</p>
      </div>

      {/* Discrepancy Warning Banner */}
      {hasRecordMismatch && (
        <div className="p-4 bg-[var(--status-amber-bg)] border border-[var(--status-amber)]/30 rounded-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px] text-[var(--status-amber)] shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Catalog Database Discrepancy Detected: </span>
              <span>
                Database has {totalProductsInDb.toLocaleString()} records, but current active catalogs total {totalDatasetRecords.toLocaleString()} items (orphaned records from previous runs).
              </span>
            </div>
          </div>
          <Link
            to="/settings"
            className="btn-outlined border-[var(--status-amber)]/50 text-[var(--status-amber)] hover:bg-[var(--status-amber)]/10 text-[12px] py-1.5 px-3 whitespace-nowrap shrink-0 inline-flex items-center gap-1"
          >
            Settings &gt; Clear All Data →
          </Link>
        </div>
      )}

      {/* Hero Block */}
      <div className="card-surface p-6 sm:p-8">
        {runsLoading ? (
          <div className="space-y-3">
            <div className="h-4 w-32 skeleton-flat" />
            <div className="h-8 w-80 skeleton-flat" />
            <div className="h-4 w-48 skeleton-flat" />
          </div>
        ) : latestCompletedRun ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="section-label">LATEST RESOLUTION</span>
                <span className="font-mono text-[12px] text-[var(--text-muted)]">
                  {latestCompletedRun.scope === 'ALL_DATASETS' || !latestCompletedRun.datasetId
                    ? `All Datasets (${latestCompletedRun.datasetCount || 'All'})`
                    : latestCompletedRun.datasetFilename || `Dataset #${latestCompletedRun.datasetId}`}
                </span>
              </div>
              <div className="text-[20px] sm:text-[22px] font-semibold text-[var(--text-primary)] tracking-[-0.02em] leading-snug">
                <span className="font-mono text-[18px] text-[var(--text-primary)] font-normal">{latestCompletedRun.inputRecords?.toLocaleString() ?? 0}</span> products resolved into{' '}
                <span className="font-mono text-[18px] text-[var(--text-primary)] font-normal">{latestCompletedRun.entitiesFormed?.toLocaleString() ?? 0}</span> unique entities
              </div>
              <div className="flex items-center gap-4 text-[13px] text-[var(--text-secondary)]">
                <span>
                  <span className="font-mono text-[12px] text-[var(--text-muted)]">
                    {Math.max(0, (latestCompletedRun.inputRecords || 0) - (latestCompletedRun.entitiesFormed || 0)).toLocaleString()}
                  </span>{' '}
                  duplicates eliminated
                </span>
                <span className="text-[var(--border)]">•</span>
                <span className="font-mono text-[12px] text-[var(--text-muted)]">
                  {formatTimestamp(latestCompletedRun.completedAt || latestCompletedRun.startedAt)}
                </span>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <Link
                to={`/entities?runId=${latestCompletedRun.id}`}
                className="inline-flex items-center text-[13px] font-medium text-[var(--accent)] hover:underline gap-1 select-none"
              >
                View Results →
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">No runs yet</h3>
              <p className="text-[13px] text-[var(--text-muted)] mt-1">Upload a product catalog to get started with entity resolution.</p>
            </div>
            <Link to="/datasets">
              <Button className="btn-primary">Upload Catalog</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Two Columns: Left 60% Recent Runs, Right 40% Stat Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 60%: Recent Runs */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="section-label">RECENT RUNS</span>
            <Link to="/pipeline" className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] uppercase tracking-[0.08em] transition-colors">
              VIEW PIPELINE →
            </Link>
          </div>

          <div className="card-surface overflow-hidden divide-y divide-[var(--border-subtle)]">
            {runsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 skeleton-flat w-full" />
                ))}
              </div>
            ) : runsError ? (
              <div className="p-6 text-[13px] text-[var(--text-muted)] text-center font-sans">
                Couldn't load data — start the backend to continue.
              </div>
            ) : runs.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-[var(--text-muted)]">
                No runs recorded yet.
              </div>
            ) : (
              runs.slice(0, 6).map((run) => (
                <div
                  key={run.id}
                  onClick={() => navigate(`/entities?runId=${run.id}`)}
                  className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[12px] text-[var(--text-muted)] shrink-0">
                      RUN-{run.id}
                    </span>
                    <span className="text-[13px] text-[var(--text-primary)] truncate font-normal">
                      {run.scope === 'ALL_DATASETS' || !run.datasetId
                        ? `All Datasets (${run.datasetCount || 'All'})`
                        : run.datasetFilename || `Dataset #${run.datasetId}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex items-center gap-3 font-mono text-[12px] text-[var(--text-muted)]">
                      <span>{run.inputRecords?.toLocaleString() ?? '—'} recs</span>
                      <span className="text-[var(--border)]">•</span>
                      <span>{run.entitiesFormed?.toLocaleString() ?? '—'} ents</span>
                    </div>
                    <StatusBadge variant={run.status} label={run.status} />
                    <span className="font-mono text-[12px] text-[var(--text-muted)] hidden md:inline-block">
                      {formatTimestamp(run.startedAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 40%: Stat Strip */}
        <div className="lg:col-span-5 space-y-3">
          <span className="section-label">GLOBAL METRICS</span>
          <div className="card-surface p-6 divide-y divide-[var(--border-subtle)]">
            {/* Stat 1: Total Catalogs */}
            <div className="pb-5">
              {datasetsLoading ? (
                <div className="h-7 w-20 skeleton-flat mb-1" />
              ) : (
                <div className="stat-number">{datasets.length}</div>
              )}
              <div className="stat-label mt-1">TOTAL CATALOGS</div>
            </div>

            {/* Stat 2: Total Records */}
            <div className="py-5">
              {statsLoading ? (
                <div className="h-7 w-28 skeleton-flat mb-1" />
              ) : (
                <div className="stat-number">
                  {stats?.totalListings != null ? stats.totalListings.toLocaleString() : '—'}
                </div>
              )}
              <div className="stat-label mt-1">TOTAL RECORDS</div>
            </div>

            {/* Stat 3: Total Entities */}
            <div className="py-5">
              {statsLoading ? (
                <div className="h-7 w-24 skeleton-flat mb-1" />
              ) : (
                <div className="stat-number">
                  {stats?.totalResolvedEntities != null ? stats.totalResolvedEntities.toLocaleString() : '—'}
                </div>
              )}
              <div className="stat-label mt-1">TOTAL ENTITIES</div>
            </div>

            {/* Stat 4: Avg Confidence */}
            <div className="pt-5">
              {statsLoading ? (
                <div className="h-7 w-20 skeleton-flat mb-1" />
              ) : (
                <div className="stat-number">
                  {stats?.averageMatchConfidence != null ? `${stats.averageMatchConfidence.toFixed(1)}%` : '—'}
                </div>
              )}
              <div className="stat-label mt-1">AVG CONFIDENCE</div>
            </div>
          </div>
        </div>
      </div>

      {/* Start Run Modal (if triggered) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card-surface w-full max-w-md p-6 space-y-5">
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Start Entity Resolution Pipeline</h3>
              <p className="text-[13px] text-[var(--text-muted)] mt-1">
                Execute cross-dataset entity resolution across all uploaded catalogs.
              </p>
            </div>

            {datasetsLoading ? (
              <div className="h-10 skeleton-flat" />
            ) : datasets.length === 0 ? (
              <div className="p-4 bg-[var(--status-amber-bg)] border border-[var(--status-amber)]/30 rounded-[7px] text-[13px] text-[var(--status-amber)]">
                No catalogs uploaded yet. Please <Link to="/datasets" className="underline font-medium">upload a catalog</Link> first.
              </div>
            ) : (
              <div className="p-4 bg-[var(--bg-canvas)] border border-[var(--border)] rounded-[8px] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    CROSS-DATASET PIPELINE SCOPE
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)] font-mono text-[11px] font-semibold">
                    {datasets.length} Catalogs
                  </span>
                </div>
                
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Will run across ALL {datasets.length} datasets ({totalDatasetRecords.toLocaleString()} total products)
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {datasets.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between text-[12px] font-mono text-[var(--text-secondary)] py-1 border-b border-[var(--border-subtle)] last:border-0"
                    >
                      <span className="truncate max-w-[200px]" title={d.filename}>
                        {d.filename}
                      </span>
                      <span>{d.recordCount?.toLocaleString() || 0} items</span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-[var(--text-muted)]">
                  Multi-catalog indexing matches duplicate products across all uploaded sources simultaneously.
                </p>
              </div>
            )}

            {modalError && (
              <div className="text-[12px] text-[var(--text-muted)] font-sans">
                {modalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="btn-outlined"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartRun}
                disabled={startingRun || datasets.length === 0}
                className="btn-primary"
              >
                {startingRun ? 'Starting...' : 'Execute Resolution →'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
