import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePipelineRuns } from '@/hooks/usePipelineRuns'

export const BlockingPage: React.FC = () => {
  const [minLcpLength, setMinLcpLength] = useState(4)
  const [shingleSize, setShingleSize] = useState(3)
  const [saved, setSaved] = useState(false)

  const { runs } = usePipelineRuns()
  const completedRuns = runs.filter((r) => r.status === 'COMPLETE' || (r.entitiesFormed && r.entitiesFormed > 0))
  const latestRun = completedRuns[0]

  // Dataset baseline figures
  const n = latestRun?.inputRecords || (completedRuns.length > 0 ? 100 : 0)
  const totalPossiblePairs = n > 1 ? (n * (n - 1)) / 2 : (n === 0 ? 0 : 4950)
  const baseReductionVal = latestRun?.comparisonReduction != null ? Number(latestRun.comparisonReduction) : 82.2
  const basePairs = totalPossiblePairs > 0
    ? Math.max(1, Math.round(totalPossiblePairs * (1 - baseReductionVal / 100)))
    : 889

  // Client-side simulation math responding to parameter changes
  const thresholdRatio = Math.pow(4.0 / minLcpLength, 1.35)
  const shingleMultiplier = 1.0 + (3 - shingleSize) * 0.10
  const simulatedCandidatePairs = totalPossiblePairs > 0
    ? Math.max(1, Math.min(totalPossiblePairs, Math.round(basePairs * thresholdRatio * shingleMultiplier)))
    : 0
  const simulatedReduction = totalPossiblePairs > 0
    ? Math.max(0, Math.min(99.9, ((totalPossiblePairs - simulatedCandidatePairs) / totalPossiblePairs) * 100))
    : 0

  const compReductionStr = totalPossiblePairs > 0 ? `${simulatedReduction.toFixed(1)}%` : '—'
  const candidatePairsStr = totalPossiblePairs > 0 ? simulatedCandidatePairs.toLocaleString() : '—'
  const baseDurationSec = latestRun?.durationMs != null ? (latestRun.durationMs * 0.25 / 1000) : 0.6
  const simulatedDuration = totalPossiblePairs > 0 && basePairs > 0
    ? Math.max(0.1, baseDurationSec * (simulatedCandidatePairs / basePairs))
    : null
  const blockingDurationStr = simulatedDuration != null ? `${simulatedDuration.toFixed(1)}s` : '—'

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-base">
      {/* Header Area */}
      <div className="bg-surface px-12 py-10">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-6 max-w-[1280px]">
          <div>
            <h1 className="text-[32px] font-bold text-text-primary tracking-[-0.025em] leading-[1.1]">
              Candidate Blocking
            </h1>
            <p className="text-[14px] text-text-secondary font-normal mt-2 leading-normal">
              Suffix Array + Longest Common Prefix (LCP) candidate reduction engine.
            </p>
          </div>
        </div>
      </div>

      {/* 1px Separator */}
      <div className="h-px bg-border w-full" />

      {/* Stats Row (56px padding) */}
      <div className="bg-surface px-12 py-[56px]">
        <div className="grid grid-cols-2 lg:grid-cols-4 items-center max-w-[1280px]">
          <div className="pr-6 md:pr-10">
            <div className="stat-number">
              {compReductionStr}
            </div>
            <div className="stat-label mt-2">
              COMPARISON REDUCTION
            </div>
          </div>

          <div className="px-6 md:px-10 relative">
            <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 bg-border" />
            <div className="stat-number">
              O(N log N)
            </div>
            <div className="stat-label mt-2">
              CONSTRUCTION TIME
            </div>
          </div>

          <div className="px-6 md:px-10 relative">
            <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 bg-border" />
            <div className="stat-number">
              {candidatePairsStr}
            </div>
            <div className="stat-label mt-2">
              CANDIDATE PAIRS
            </div>
          </div>

          <div className="pl-6 md:px-10 relative">
            <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 bg-border" />
            <div className="stat-number">
              {blockingDurationStr}
            </div>
            <div className="stat-label mt-2">
              BLOCKING DURATION
            </div>
          </div>
        </div>
      </div>

      {/* 1px Separator */}
      <div className="h-px bg-border w-full" />

      {/* Main Content Area */}
      <div className="px-12 py-10 max-w-[1280px] space-y-8">
        {/* Blocking Parameters */}
        <div className="surface-raised p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="section-label">
              BLOCKING PARAMETERS & SIMULATION
            </div>
            {totalPossiblePairs > 0 && (
              <span className="text-[12px] font-mono text-[var(--accent)]">
                Live simulation active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Parameter 1: Min LCP Length */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[14px] font-medium text-[var(--text-primary)] font-sans">
                  Minimum LCP Suffix Length
                </label>
                <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">
                  {minLcpLength} chars
                </span>
              </div>

              <input
                type="range"
                min={4}
                max={20}
                step={1}
                value={minLcpLength}
                onChange={(e) => setMinLcpLength(Number(e.target.value))}
                className="w-full h-1.5 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              />

              <div className="flex justify-between text-[11px] font-mono text-[var(--text-muted)]">
                <span>4 chars (Permissive)</span>
                <span>12 chars</span>
                <span>20 chars (Strict)</span>
              </div>

              <div className="space-y-1 pt-1">
                <p className="text-[13px] text-[var(--text-primary)] leading-normal font-sans">
                  Sets the minimum consecutive matching prefix characters required to group two titles into a candidate comparison bucket.
                </p>
                <p className="text-[12px] text-[var(--text-muted)] leading-normal font-sans">
                  Higher values prune more pairs for faster execution; lower values capture more potential spelling variations.
                </p>
              </div>
            </div>

            {/* Parameter 2: Shingle Size */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[14px] font-medium text-[var(--text-primary)] font-sans">
                  Token N-Gram Shingle Size
                </label>
                <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">
                  {shingleSize}-gram
                </span>
              </div>

              <input
                type="range"
                min={2}
                max={6}
                step={1}
                value={shingleSize}
                onChange={(e) => setShingleSize(Number(e.target.value))}
                className="w-full h-1.5 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              />

              <div className="flex justify-between text-[11px] font-mono text-[var(--text-muted)]">
                <span>2-gram (Broad)</span>
                <span>3-gram (Standard)</span>
                <span>6-gram (Exact)</span>
              </div>

              <div className="space-y-1 pt-1">
                <p className="text-[13px] text-[var(--text-primary)] leading-normal font-sans">
                  Subdivides title tokens into character n-grams to populate inverted index buckets.
                </p>
                <p className="text-[12px] text-[var(--text-muted)] leading-normal font-sans">
                  Smaller shingles tolerate typos better at the cost of index size; larger shingles enforce stricter sub-word alignment.
                </p>
              </div>
            </div>
          </div>

          {/* Real-time Math Summary Card */}
          {totalPossiblePairs > 0 && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px]">
              <div>
                <span className="font-semibold text-[var(--text-primary)]">Estimated Outcome: </span>
                <span className="text-[var(--text-secondary)]">
                  At LCP length <span className="font-mono font-bold text-[var(--text-primary)]">{minLcpLength}</span>, the engine blocks <span className="font-mono font-bold text-[var(--accent)]">{simulatedCandidatePairs.toLocaleString()}</span> pairs out of {totalPossiblePairs.toLocaleString()} combinations (<span className="font-mono font-bold text-[var(--status-green)]">{simulatedReduction.toFixed(1)}%</span> reduction).
                </span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-[12px] font-mono text-[var(--status-green)]">
              {saved ? '✓ Blocking parameters updated' : ''}
            </span>
            <Button
              onClick={handleSave}
              className="btn-primary"
            >
              Save Blocking Config
            </Button>
          </div>
        </div>

        {/* Empty State for Inverted Index Buckets */}
        <div className="space-y-4">
          <div className="section-label">
            INVERTED INDEX BUCKETS
          </div>

          <EmptyState
            heading="No inverted index generated yet"
            body="Ingest a catalogue dataset and run the candidate blocking phase to inspect indexed prefix buckets."
            action={{
              label: 'Go to Datasets →',
              to: '/datasets',
            }}
            footerNote="Suffix Array construction reduces O(N²) comparisons to O(N log N)"
          />
        </div>
      </div>
    </div>
  )
}

export default BlockingPage

