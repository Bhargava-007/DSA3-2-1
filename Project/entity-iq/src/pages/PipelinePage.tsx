import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'
import { usePipelineRuns } from '@/hooks/usePipelineRuns'
import { usePipelineStatus } from '@/hooks/usePipelineStatus'
import { useDatasets } from '@/hooks/useDatasets'
import { useCache } from '@/context/CacheContext'
import { api } from '@/lib/api'
import { Play, Layers, ArrowRight, Eye, CheckCircle2, Clock } from 'lucide-react'

interface PipelineStepDef {
  number: number
  stageKey: string
  friendlyName: string
  description: string
}

const pipelineSteps: PipelineStepDef[] = [
  {
    number: 1,
    stageKey: 'INITIALIZING',
    friendlyName: 'Reading Catalog',
    description: 'Loading CSV records into memory and initializing pipeline state',
  },
  {
    number: 2,
    stageKey: 'TOKENIZATION',
    friendlyName: 'Trie Tokenization & Filtering',
    description: 'Tokenizing titles & descriptions, filtering stop-words with Trie O(L) lookup',
  },
  {
    number: 3,
    stageKey: 'CANDIDATE_BLOCKING',
    friendlyName: 'Candidate Blocking (Suffix Array + Inverted Index)',
    description: 'Kasai LCP window sliding & inverted index posting list intersection',
  },
  {
    number: 4,
    stageKey: 'SIMILARITY_SCORING',
    friendlyName: 'Similarity Scoring (KMP, Rabin-Karp, Levenshtein, Jaccard)',
    description: 'Double-hashed 3-grams, Wagner-Fischer edit distance, and exact token matching',
  },
  {
    number: 5,
    stageKey: 'CLUSTERING',
    friendlyName: 'Graph Clustering (Union-Find DSU)',
    description: 'Merging connected candidate pairs with path compression & union by rank',
  },
  {
    number: 6,
    stageKey: 'CANONICAL_SELECTION',
    friendlyName: 'Priority Queue Ranking & Canonical Selection',
    description: 'Max-Heap cluster ranking by confidence and canonical record synthesis',
  },
]

const stageOrder = [
  'INITIALIZING',
  'TOKENIZATION',
  'CANDIDATE_BLOCKING',
  'SIMILARITY_SCORING',
  'CLUSTERING',
  'CANONICAL_SELECTION',
  'FINALIZING',
  'COMPLETE',
]

export const PipelinePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { invalidate, invalidateRun } = useCache()
  const { runs, loading: runsLoading, error: runsError, refetch: refetchRuns } = usePipelineRuns()
  const { datasets } = useDatasets()

  const runIdParam = searchParams.get('runId')
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [triggerModal, setTriggerModal] = useState(false)
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | ''>('')
  const [starting, setStarting] = useState(false)

  // Sync selected run
  useEffect(() => {
    if (runIdParam) {
      setSelectedRunId(Number(runIdParam))
    } else if (runs.length > 0 && !selectedRunId) {
      setSelectedRunId(runs[0].id)
    }
  }, [runIdParam, runs, selectedRunId])

  const selectedRun = runs.find((r) => r.id === selectedRunId)
  const isSelectedRunning = selectedRun?.status === 'RUNNING' || selectedRun?.status === 'PENDING'

  // Poll status dynamically for the selected run
  const { status: liveStatus, stage: liveStage, progressPct } = usePipelineStatus(
    selectedRunId,
    () => {
      invalidate('runs')
      invalidate('datasets')
      invalidate('stats')
      if (selectedRunId) {
        invalidateRun(selectedRunId)
      }
      refetchRuns()
    }
  )

  const currentStatus = liveStatus || selectedRun?.status || 'PENDING'
  const currentStage = liveStage || selectedRun?.stage || 'INITIALIZING'

  const getStageState = (stepKey: string) => {
    if (currentStatus === 'COMPLETE') return 'complete'
    if (currentStatus === 'FAILED') return 'failed'

    const currentIndex = stageOrder.indexOf(currentStage.toUpperCase())
    const stepIndex = stageOrder.indexOf(stepKey.toUpperCase())

    if (currentIndex === -1 || stepIndex === -1) {
      return 'pending'
    }

    if (stepIndex < currentIndex) return 'complete'
    if (stepIndex === currentIndex) return 'active'
    return 'pending'
  }

  const activeStepNum = (() => {
    if (currentStatus === 'COMPLETE') return 6
    const idx = stageOrder.indexOf(currentStage.toUpperCase())
    if (idx === -1) return 1
    return Math.min(pipelineSteps.length, Math.max(1, idx + 1))
  })()

  const progressPercentage = (() => {
    if (currentStatus === 'COMPLETE') return 100
    if (progressPct != null && progressPct > 0) return progressPct
    return Math.round((activeStepNum / pipelineSteps.length) * 100)
  })()

  const totalProducts = datasets.reduce((acc, d) => acc + (d.recordCount || 0), 0)

  const handleStartRun = async () => {
    if (datasets.length === 0) return
    setStarting(true)
    try {
      // Execute cross-dataset resolution across ALL datasets
      const res = await api.runPipeline()
      setTriggerModal(false)
      invalidate('runs')
      invalidate('datasets')
      invalidate('stats')
      if (res.runId) {
        invalidateRun(res.runId)
      }
      refetchRuns()
      setSelectedRunId(res.runId)
      setSearchParams({ runId: res.runId.toString() })
    } catch (err: any) {
      alert(err?.message || 'Failed to start pipeline run')
    } finally {
      setStarting(false)
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms || ms <= 0) return '—'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Pipeline Execution</h1>
          <p className="page-subtitle">Execute and inspect the 5-stage DSA entity matching pipeline.</p>
        </div>

        <Button
          onClick={() => {
            if (datasets.length > 0 && !selectedDatasetId) {
              setSelectedDatasetId(datasets[0].id)
            }
            setTriggerModal(true)
          }}
          className="btn-primary flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          Start New Run
        </Button>
      </div>

      {/* Top Inspector Bar: Past Runs Selector */}
      <div className="card-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="section-label text-[12px] font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[var(--accent)]" />
            VIEW PAST RUN:
          </span>
          {runsLoading ? (
            <div className="h-9 w-48 skeleton-flat" />
          ) : runs.length === 0 ? (
            <span className="text-[13px] text-[var(--text-muted)]">No runs executed yet</span>
          ) : (
            <select
              value={selectedRunId || ''}
              onChange={(e) => {
                const id = Number(e.target.value)
                setSelectedRunId(id)
                setSearchParams({ runId: id.toString() })
              }}
              className="font-mono text-[12px] bg-[var(--bg-canvas)] border border-[var(--border)] rounded-[6px] px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  RUN-{r.id} — {r.datasetFilename || `Dataset #${r.datasetId}`} ({r.status})
                </option>
              ))}
            </select>
          )}

          {selectedRun && (
            <div className="hidden md:flex items-center gap-3 font-mono text-[12px] text-[var(--text-muted)] pl-2">
              <span>{selectedRun.inputRecords?.toLocaleString() || 0} records</span>
              <span className="text-[var(--border)]">•</span>
              <span>{selectedRun.entitiesFormed?.toLocaleString() || 0} entities formed</span>
              <span className="text-[var(--border)]">•</span>
              <span>{formatDuration(selectedRun.durationMs)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {selectedRun && <StatusBadge variant={currentStatus} label={currentStatus} />}
        </div>
      </div>

      {/* Active Run Inspector Card with Progress Bar */}
      {selectedRun ? (
        <div className="card-surface p-6 sm:p-8 space-y-6 shadow-sm border border-[var(--border)]">
          {/* Header of the Inspector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-[var(--text-primary)] font-mono">
                  RUN-{selectedRun.id}
                </span>
                <span className="text-[13px] text-[var(--text-muted)]">
                  ({selectedRun.datasetFilename || `Dataset #${selectedRun.datasetId}`})
                </span>
              </div>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 font-sans">
                Started {formatTimestamp(selectedRun.startedAt)}
              </p>
            </div>

            {selectedRun.status === 'COMPLETE' && (
              <div className="flex items-center gap-3">
                <Link
                  to={`/entities?runId=${selectedRun.id}`}
                  className="btn-outlined text-[12px] py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  View Entities ({selectedRun.entitiesFormed || 0})
                </Link>
                <Link
                  to={`/compare?runId=${selectedRun.id}`}
                  className="btn-outlined text-[12px] py-1.5 px-3 flex items-center gap-1.5"
                >
                  Inspect Matches
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Progress bar at top of stage list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--text-secondary)] font-medium">
                {currentStatus === 'COMPLETE'
                  ? 'All 6 stages completed successfully'
                  : currentStatus === 'FAILED'
                  ? 'Pipeline execution encountered an error'
                  : `Stage ${activeStepNum} of ${pipelineSteps.length}: ${currentStage}`}
              </span>
              <span className="font-mono text-[13px] text-[var(--text-primary)] font-semibold">
                {progressPercentage}%
              </span>
            </div>

            <div className="w-full bg-[var(--bg-canvas)] border border-[var(--border)] h-[6px] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  currentStatus === 'COMPLETE'
                    ? 'bg-[var(--status-green)]'
                    : currentStatus === 'FAILED'
                    ? 'bg-[var(--status-red)]'
                    : 'bg-[var(--accent)]'
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Vertical Stage Rows */}
          <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-[8px] overflow-hidden bg-[var(--bg-surface)]">
            {pipelineSteps.map((step) => {
              const state = getStageState(step.stageKey)
              const isComplete = state === 'complete'
              const isActive = state === 'active'
              const isPending = state === 'pending'

              return (
                <div
                  key={step.number}
                  className={cn(
                    'p-4 flex items-center justify-between gap-4 transition-colors',
                    isActive && 'bg-[var(--accent)]/5'
                  )}
                >
                  {/* Left Side: Step Circle & Text */}
                  <div className="flex items-center gap-3.5 shrink-0">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center select-none shrink-0 font-sans text-[13px]',
                        isComplete && 'bg-[var(--status-green)] text-white font-bold',
                        isActive && 'bg-[var(--accent)] text-white font-bold animate-pulse',
                        isPending && 'bg-[var(--bg-canvas)] border border-[var(--border)] text-[var(--text-muted)]'
                      )}
                    >
                      {isComplete ? '✓' : step.number}
                    </div>

                    <div>
                      <div className="text-[13px] font-medium text-[var(--text-primary)]">
                        {step.friendlyName}
                      </div>
                      <div className="text-[12px] text-[var(--text-muted)] font-normal hidden sm:block">
                        {step.description}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Status Text */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isComplete && (
                      <span className="text-[12px] font-medium text-[var(--status-green)] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete
                      </span>
                    )}

                    {isActive && (
                      <span className="text-[12px] font-semibold text-[var(--accent)] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
                        Running...
                      </span>
                    )}

                    {isPending && (
                      <span className="text-[12px] font-normal text-[var(--text-muted)]">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card-surface p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] mx-auto flex items-center justify-center">
            <Play className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">No Pipeline Runs Yet</h3>
            <p className="text-[13px] text-[var(--text-secondary)] max-w-md mx-auto mt-1">
              Upload a product catalog CSV and start your first entity matching run.
            </p>
          </div>
          <Button
            onClick={() => setTriggerModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Start New Run
          </Button>
        </div>
      )}

      {/* Execution History Table */}
      {runs.length > 0 && (
        <div className="card-surface p-6 sm:p-8 space-y-4 shadow-sm border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--text-muted)]" />
              Pipeline Execution History ({runs.length})
            </h3>
            <span className="text-[12px] text-[var(--text-muted)] font-mono">
              Click Inspect to load past run
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] font-sans">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[12px] uppercase tracking-wider font-mono">
                  <th className="pb-3 font-medium">Run</th>
                  <th className="pb-3 font-medium">Dataset Catalog</th>
                  <th className="pb-3 font-medium">Input Records</th>
                  <th className="pb-3 font-medium">Entities Formed</th>
                  <th className="pb-3 font-medium">Reduction</th>
                  <th className="pb-3 font-medium">Duration</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {runs.map((r) => {
                  const isCurrent = r.id === selectedRunId
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        'hover:bg-[var(--bg-hover)] transition-colors',
                        isCurrent && 'bg-[var(--accent)]/5'
                      )}
                    >
                      <td className="py-3.5 font-mono font-medium text-[var(--text-primary)]">
                        RUN-{r.id}
                        {isCurrent && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-[var(--accent)] text-white text-[10px] font-bold">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-[var(--text-primary)]">
                        {r.scope === 'ALL_DATASETS' || !r.datasetId
                          ? `All Datasets (${r.datasetCount || 'All'})`
                          : r.datasetFilename || `Dataset #${r.datasetId}`}
                      </td>
                      <td className="py-3.5 font-mono text-[var(--text-secondary)]">
                        {r.inputRecords?.toLocaleString() || '—'}
                      </td>
                      <td className="py-3.5 font-mono text-[var(--text-secondary)]">
                        {r.entitiesFormed?.toLocaleString() || '—'}
                      </td>
                      <td className="py-3.5 font-mono text-[var(--text-secondary)]">
                        {r.comparisonReduction ? `${r.comparisonReduction}%` : '—'}
                      </td>
                      <td className="py-3.5 font-mono text-[var(--text-secondary)]">
                        {formatDuration(r.durationMs)}
                      </td>
                      <td className="py-3.5">
                        <StatusBadge variant={r.status} label={r.status} />
                      </td>
                      <td className="py-3.5 text-right">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedRunId(r.id)
                            setSearchParams({ runId: r.id.toString() })
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className={cn(
                            'btn-outlined text-[12px] py-1 px-3 cursor-pointer',
                            isCurrent && 'border-[var(--accent)] text-[var(--accent)]'
                          )}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Start New Pipeline Run Modal */}
      {triggerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !starting) setTriggerModal(false)
          }}
        >
          <div className="card-surface shadow-2xl w-full max-w-md p-6 space-y-5 border border-[var(--border)]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                  Start New Pipeline Run
                </h3>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                  Execute cross-dataset entity resolution across all uploaded catalogs.
                </p>
              </div>
            </div>

            {datasets.length === 0 ? (
              <div className="p-4 bg-[var(--status-amber-bg)] border border-[var(--status-amber)]/30 rounded-[7px] text-[13px] text-[var(--status-amber)] space-y-2">
                <p className="font-medium">No catalogs found.</p>
                <p className="text-[12px]">Please upload at least one product CSV before running the pipeline.</p>
                <Link to="/datasets" className="btn-primary text-[12px] py-1 px-3 inline-block mt-2">
                  Upload Catalog →
                </Link>
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
                  Will run across ALL {datasets.length} datasets ({totalProducts.toLocaleString()} total products)
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

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
              <Button
                variant="outline"
                onClick={() => setTriggerModal(false)}
                disabled={starting}
                className="btn-outlined text-[13px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartRun}
                disabled={starting || datasets.length === 0}
                className="btn-primary flex items-center gap-2 text-[13px]"
              >
                {starting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting Pipeline...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Execute Matching Run
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PipelinePage

