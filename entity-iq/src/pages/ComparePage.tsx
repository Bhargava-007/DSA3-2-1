import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePipelineRuns } from '@/hooks/usePipelineRuns'
import { usePairs } from '@/hooks/usePairs'
import { api, type CandidatePair } from '@/lib/api'
import { cn } from '@/lib/utils'

export const ComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { runs, loading: runsLoading } = usePipelineRuns()
  const completedRuns = runs.filter((r) => r.status === 'COMPLETE')

  const runIdParam = searchParams.get('runId')
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [currentPairIndex, setCurrentPairIndex] = useState<number>(0)
  const [activePairDetail, setActivePairDetail] = useState<CandidatePair | null>(null)
  const [loadingPairDetail, setLoadingPairDetail] = useState<boolean>(false)

  // Default run selection
  useEffect(() => {
    if (runIdParam) {
      setSelectedRunId(Number(runIdParam))
    } else if (completedRuns.length > 0 && !selectedRunId) {
      setSelectedRunId(completedRuns[0].id)
    }
  }, [runIdParam, completedRuns, selectedRunId])

  const { pairs, totalElements, loading: pairsLoading, error: pairsError } = usePairs(
    selectedRunId || undefined,
    0.6,
    0,
    100
  )

  // Sync active pair when pairs change or index changes
  useEffect(() => {
    if (pairs.length > 0) {
      const idx = Math.min(currentPairIndex, pairs.length - 1)
      const currentPair = pairs[idx]
      if (currentPair) {
        loadPairDetail(currentPair.id)
      }
    } else {
      setActivePairDetail(null)
    }
  }, [pairs, currentPairIndex])

  const loadPairDetail = async (pairId: number) => {
    setLoadingPairDetail(true)
    try {
      const detail = await api.getPair(pairId)
      setActivePairDetail(detail)
    } catch (e) {
      // error handling
    } finally {
      setLoadingPairDetail(false)
    }
  }

  const handlePrev = () => {
    if (currentPairIndex > 0) {
      setCurrentPairIndex((prev) => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentPairIndex < pairs.length - 1) {
      setCurrentPairIndex((prev) => prev + 1)
    }
  }

  const prodA = activePairDetail?.productA
  const prodB = activePairDetail?.productB
  const score = activePairDetail ? Number(activePairDetail.finalScore) : 0

  const getScoreColor = (val: number) => {
    if (val > 0.85) return 'text-[var(--status-green)]'
    if (val >= 0.6) return 'text-[var(--status-amber)]'
    return 'text-[var(--status-red)]'
  }

  const isBrandMatch = prodA?.brand && prodB?.brand && prodA.brand.toLowerCase() === prodB.brand.toLowerCase()
  const isTitleMatch = (activePairDetail?.titleSimilarity || 0) > 0.8
  const isPriceMatch = prodA?.price != null && prodB?.price != null && Math.abs(Number(prodA.price) - Number(prodB.price)) < 1.0

  return (
    <div className="space-y-6 max-w-[1280px]">
      {/* Header & Run Selector */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="page-title">Compare</h1>
          <p className="page-subtitle">Side-by-side pairwise attribute decomposition and match confidence.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="section-label text-[11px] font-semibold text-[var(--text-muted)] whitespace-nowrap">
            VIEW PAST RUN:
          </span>
          <select
            value={selectedRunId || ''}
            onChange={(e) => {
              const id = Number(e.target.value)
              setSelectedRunId(id)
              setCurrentPairIndex(0)
              setSearchParams({ runId: id.toString() })
            }}
            disabled={runsLoading || completedRuns.length === 0}
            className="font-mono text-[12px] bg-[var(--bg-surface)] border-[1.5px] border-[var(--border)] rounded-[7px] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
          >
            {completedRuns.length === 0 ? (
              <option value="">No completed runs</option>
            ) : (
              completedRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  RUN-{r.id} — {r.datasetFilename || `Dataset #${r.datasetId}`} ({r.entitiesFormed || 0} entities)
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {pairsError ? (
        <EmptyState
          heading="Couldn't load data — start the backend to continue."
          body="Ensure the Spring Boot backend server is active on port 8080."
        />
      ) : pairsLoading ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] p-12 space-y-6 shadow-[var(--shadow-sm)]">
          <div className="h-10 w-48 skeleton-flat mx-auto" />
          <div className="grid grid-cols-2 gap-8">
            <div className="h-64 skeleton-flat" />
            <div className="h-64 skeleton-flat" />
          </div>
        </div>
      ) : pairs.length === 0 ? (
        <EmptyState
          heading="No candidate pairs found"
          body="No candidate pairs have been scored for this pipeline run."
        />
      ) : (
        <div className="card-surface p-6 sm:p-8 space-y-8">
          {/* Top Center: Large Confidence Score in IBM Plex Mono 32px 700 */}
          <div className="text-center space-y-1">
            <div className={cn('font-mono text-[32px] font-bold tracking-tight', getScoreColor(score))}>
              {loadingPairDetail ? '—' : `${(score * 100).toFixed(0)}%`}
            </div>
            <div className="section-label">MATCH CONFIDENCE</div>
          </div>

          {loadingPairDetail ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative py-2">
              <div className="space-y-4 animate-pulse">
                <div className="h-6 w-36 skeleton-flat" />
                <div className="h-16 skeleton-flat rounded-[6px]" />
                <div className="h-12 skeleton-flat rounded-[6px]" />
                <div className="h-10 skeleton-flat rounded-[6px]" />
                <div className="h-24 skeleton-flat rounded-[6px]" />
              </div>
              <div className="space-y-4 animate-pulse">
                <div className="h-6 w-36 skeleton-flat" />
                <div className="h-16 skeleton-flat rounded-[6px]" />
                <div className="h-12 skeleton-flat rounded-[6px]" />
                <div className="h-10 skeleton-flat rounded-[6px]" />
                <div className="h-24 skeleton-flat rounded-[6px]" />
              </div>
            </div>
          ) : (
            /* Two-Column Side-by-Side Product Cards with 1px Center Divider */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
              {/* Center Divider */}
              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-[var(--border)] -translate-x-1/2" />

              {/* Left Product Card (Listing A) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <span className="section-label">
                    LISTING A ({prodA?.source || 'SOURCE 1'})
                  </span>
                  <span className="font-mono text-[12px] text-[var(--text-muted)]">
                    SKU: {prodA?.externalId || `ID-${activePairDetail?.productAId}`}
                  </span>
                </div>

                {/* Title */}
                <div className={cn('p-3 rounded-[6px] bg-[var(--bg-canvas)]', isTitleMatch ? 'border-l-2 border-[var(--status-green)]' : 'border-l-2 border-[var(--status-amber)]')}>
                  <div className="section-label mb-1">TITLE</div>
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">
                    {prodA?.title || '—'}
                  </div>
                </div>

                {/* Brand */}
                <div className={cn('p-3 rounded-[6px] bg-[var(--bg-canvas)]', isBrandMatch ? 'border-l-2 border-[var(--status-green)]' : 'border-l-2 border-[var(--status-amber)]')}>
                  <div className="section-label mb-1">BRAND</div>
                  <div className="text-[13px] text-[var(--text-primary)]">
                    {prodA?.brand || '—'}
                  </div>
                </div>

                {/* Price */}
                <div className={cn('p-3 rounded-[6px] bg-[var(--bg-canvas)]', isPriceMatch ? 'border-l-2 border-[var(--status-green)]' : 'border-l-2 border-[var(--status-amber)]')}>
                  <div className="section-label mb-1">PRICE</div>
                  <div className="font-mono text-[12px] text-[var(--text-primary)]">
                    {prodA?.price != null ? `$${Number(prodA.price).toFixed(2)}` : '—'}
                  </div>
                </div>

                {/* Description */}
                <div className="p-3 rounded-[6px] bg-[var(--bg-canvas)] border-l-2 border-[var(--border)]">
                  <div className="section-label mb-1">DESCRIPTION</div>
                  <div className="text-[13px] text-[var(--text-secondary)] line-clamp-4 leading-relaxed">
                    {prodA?.description || 'No description provided.'}
                  </div>
                </div>
              </div>

              {/* Right Product Card (Listing B) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <span className="section-label">
                    LISTING B ({prodB?.source || 'SOURCE 2'})
                  </span>
                  <span className="font-mono text-[12px] text-[var(--text-muted)]">
                    SKU: {prodB?.externalId || `ID-${activePairDetail?.productBId}`}
                  </span>
                </div>

                {/* Title */}
                <div className={cn('p-3 rounded-[6px] bg-[var(--bg-canvas)]', isTitleMatch ? 'border-l-2 border-[var(--status-green)]' : 'border-l-2 border-[var(--status-amber)]')}>
                  <div className="section-label mb-1">TITLE</div>
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">
                    {prodB?.title || '—'}
                  </div>
                </div>

                {/* Brand */}
                <div className={cn('p-3 rounded-[6px] bg-[var(--bg-canvas)]', isBrandMatch ? 'border-l-2 border-[var(--status-green)]' : 'border-l-2 border-[var(--status-amber)]')}>
                  <div className="section-label mb-1">BRAND</div>
                  <div className="text-[13px] text-[var(--text-primary)]">
                    {prodB?.brand || '—'}
                  </div>
                </div>

                {/* Price */}
                <div className={cn('p-3 rounded-[6px] bg-[var(--bg-canvas)]', isPriceMatch ? 'border-l-2 border-[var(--status-green)]' : 'border-l-2 border-[var(--status-amber)]')}>
                  <div className="section-label mb-1">PRICE</div>
                  <div className="font-mono text-[12px] text-[var(--text-primary)]">
                    {prodB?.price != null ? `$${Number(prodB.price).toFixed(2)}` : '—'}
                  </div>
                </div>

                {/* Description */}
                <div className="p-3 rounded-[6px] bg-[var(--bg-canvas)] border-l-2 border-[var(--border)]">
                  <div className="section-label mb-1">DESCRIPTION</div>
                  <div className="text-[13px] text-[var(--text-secondary)] line-clamp-4 leading-relaxed">
                    {prodB?.description || 'No description provided.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Navigation: Previous / Next */}
          <div className="flex items-center justify-between pt-6 border-t border-[var(--border-subtle)]">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentPairIndex === 0 || loadingPairDetail}
              className="btn-outlined"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            <span className="font-mono text-[12px] text-[var(--text-muted)]">
              Pair <strong className="text-[var(--text-primary)]">{currentPairIndex + 1}</strong> of <strong className="text-[var(--text-primary)]">{pairs.length}</strong>
            </span>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentPairIndex >= pairs.length - 1 || loadingPairDetail}
              className="btn-outlined"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ComparePage
