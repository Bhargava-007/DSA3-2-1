import React, { useState, useEffect } from 'react'
import { ScoreBar } from '@/components/ui/ScoreBar'
import { api, type SimilarityTestResult } from '@/lib/api'

export const SimilarityPage: React.FC = () => {
  const [testStr1, setTestStr1] = useState('')
  const [testStr2, setTestStr2] = useState('')
  const [loading, setLoading] = useState(false)
  const [scores, setScores] = useState<SimilarityTestResult | null>(null)

  useEffect(() => {
    const s1 = testStr1.trim()
    const s2 = testStr2.trim()

    if (!s1 || !s2) {
      setScores(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await api.testSimilarity(s1, s2)
        setScores(res)
      } catch (err) {
        console.error('Failed to compute similarity scores:', err)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [testStr1, testStr2])

  const hasInput = Boolean(testStr1.trim() && testStr2.trim())
  const weightedScore = scores ? scores.weighted * 100 : 0

  return (
    <div className="min-h-screen bg-base">
      {/* Header Area */}
      <div className="bg-surface px-12 py-10">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-6 max-w-[1280px]">
          <div>
            <h1 className="text-[32px] font-bold text-text-primary tracking-[-0.025em] leading-[1.1]">
              Similarity Engine
            </h1>
            <p className="text-[14px] text-text-secondary font-normal mt-2 leading-normal">
              Multi-signal weighted string distance and token overlap evaluation.
            </p>
          </div>
        </div>
      </div>

      {/* 1px Separator */}
      <div className="h-px bg-border w-full" />

      {/* Main Content Area */}
      <div className="px-12 py-10 max-w-[1280px] space-y-8">
        {/* Algorithms Summary Grid */}
        <div className="surface-raised p-6 grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-0">
          <div className="pr-6 md:pr-8">
            <div className="font-mono text-[13px] font-medium text-text-primary">
              KMP
            </div>
            <div className="text-[13px] text-text-secondary mt-1">
              Knuth-Morris-Pratt exact substring search. O(N+M)
            </div>
            <div className="text-[11px] font-mono text-accent mt-3">
              WEIGHT: 30%
            </div>
          </div>

          <div className="px-6 md:px-8 relative">
            <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-10 bg-border" />
            <div className="font-mono text-[13px] font-medium text-text-primary">
              Rabin–Karp
            </div>
            <div className="text-[13px] text-text-secondary mt-1">
              Rolling hash multi-pattern matching. O(N+M)
            </div>
            <div className="text-[11px] font-mono text-accent mt-3">
              WEIGHT: 15%
            </div>
          </div>

          <div className="px-6 md:px-8 relative">
            <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-10 bg-border" />
            <div className="font-mono text-[13px] font-medium text-text-primary">
              Levenshtein
            </div>
            <div className="text-[13px] text-text-secondary mt-1">
              Dynamic programming edit distance matrix. O(N·M)
            </div>
            <div className="text-[11px] font-mono text-accent mt-3">
              WEIGHT: 25%
            </div>
          </div>

          <div className="pl-6 md:px-8 relative">
            <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-10 bg-border" />
            <div className="font-mono text-[13px] font-medium text-text-primary">
              Jaccard
            </div>
            <div className="text-[13px] text-text-secondary mt-1">
              Token-set intersection over union overlap. O(|A|+|B|)
            </div>
            <div className="text-[11px] font-mono text-accent mt-3">
              WEIGHT: 30%
            </div>
          </div>
        </div>

        {/* Interactive Test Harness */}
        <div className="surface-raised p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="section-label">
              SIMILARITY METRIC TEST HARNESS
            </div>
            {loading && (
              <span className="text-[12px] font-mono text-[var(--accent)] animate-pulse flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
                Computing real-time DSA metrics...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--text-muted)]">
                STRING A (RECORD 1)
              </label>
              <input
                type="text"
                value={testStr1}
                onChange={(e) => setTestStr1(e.target.value)}
                className="w-full h-9 px-3 rounded-[7px] border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] text-[13px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="e.g. Apple AirPods Pro (2nd Gen) Wireless Earbuds"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--text-muted)]">
                STRING B (RECORD 2)
              </label>
              <input
                type="text"
                value={testStr2}
                onChange={(e) => setTestStr2(e.target.value)}
                className="w-full h-9 px-3 rounded-[7px] border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] text-[13px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="e.g. AirPods Pro Generation 2 Apple Earphones"
              />
            </div>
          </div>

          {hasInput ? (
            <div className="space-y-3 pt-4 border-t border-border">
              <ScoreBar label="KMP SUBSTRING MATCH" value={scores ? scores.kmp : 0} />
              <ScoreBar label="RABIN-KARP ROLLING HASH" value={scores ? scores.rabinKarp : 0} />
              <ScoreBar label="LEVENSHTEIN SIMILARITY" value={scores ? scores.levenshtein : 0} />
              <ScoreBar label="JACCARD TOKEN OVERLAP" value={scores ? scores.jaccard : 0} />
              <div className="pt-2 border-t border-border">
                <ScoreBar label="WEIGHTED COMPOSITE CONFIDENCE" value={scores ? scores.weighted : 0} bold />
              </div>
              <div className="pt-2 flex items-center justify-between font-mono text-[13px]">
                <span className="text-text-secondary">DECISION:</span>
                <span className="font-bold text-accent">
                  {scores
                    ? weightedScore >= 75
                      ? 'MATCH (CONFIRMED)'
                      : weightedScore >= 45
                      ? 'PROBABLE MATCH (REVIEW)'
                      : 'DISTINCT ENTITY'
                    : 'EVALUATING...'}
                </span>
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-border text-center py-6">
              <p className="text-[13px] text-text-secondary">
                Enter two strings above to evaluate live mathematical similarity decomposition via backend algorithms.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SimilarityPage

