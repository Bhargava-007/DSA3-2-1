import React, { useState, useEffect } from 'react'
import { api, type StatsOverview, type PipelineRun } from '@/lib/api'
import { useCache } from '@/context/CacheContext'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

export const AnalyticsPage: React.FC = () => {
  const { cache, getCached } = useCache()
  const [overview, setOverview] = useState<StatsOverview | null>(() => cache.stats.data)
  const [runs, setRuns] = useState<PipelineRun[]>(() => cache.runs.data || [])
  const [loading, setLoading] = useState<boolean>(() => cache.stats.data === null || cache.runs.data === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (cache.stats.data === null || cache.runs.data === null) {
        setLoading(true)
      }
      setError(null)
      try {
        const [overRes, runsRes] = await Promise.all([
          getCached<StatsOverview>('stats', () => api.getOverview()),
          getCached<PipelineRun[]>('runs', () => api.getPipelineRuns()),
        ])
        setOverview(overRes)
        setRuns(runsRes)
      } catch (err: any) {
        setError(err?.message || 'Could not load analytics data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [getCached])

  useEffect(() => {
    if (cache.stats.data !== null) setOverview(cache.stats.data)
  }, [cache.stats.data])

  useEffect(() => {
    if (cache.runs.data !== null) setRuns(cache.runs.data)
  }, [cache.runs.data])

  // Chart 1 data: entities per run
  const completedRuns = runs.filter((r: PipelineRun) => r.status === 'COMPLETE' || (r.entitiesFormed && r.entitiesFormed > 0))
  const latestCompletedRun = completedRuns[0]

  const totalEntities = overview?.totalResolvedEntities != null && overview.totalResolvedEntities > 0
    ? overview.totalResolvedEntities
    : latestCompletedRun?.entitiesFormed || 0

  const totalListings = overview?.totalListings != null && overview.totalListings > 0
    ? overview.totalListings
    : latestCompletedRun?.inputRecords || 0

  const duplicatesFound = Math.max(0, totalListings - totalEntities)

  const avgConfidence = overview?.averageMatchConfidence != null && overview.averageMatchConfidence > 0
    ? `${overview.averageMatchConfidence.toFixed(1)}%`
    : latestCompletedRun?.matchConfidence != null
    ? `${Number(latestCompletedRun.matchConfidence).toFixed(1)}%`
    : '—'

  const runsData = completedRuns.slice(0, 8).map((r: PipelineRun) => ({
    name: `RUN-${r.id}`,
    entities: r.entitiesFormed || 0,
    records: r.inputRecords || 0,
  }))

  // Chart 2 data: confidence distribution buckets
  const confidenceBuckets = [
    { range: '90–100%', count: 0 },
    { range: '75–90%', count: 0 },
    { range: '60–75%', count: 0 },
    { range: '<60%', count: 0 },
  ]

  completedRuns.forEach((r: PipelineRun) => {
    let conf = Number(r.matchConfidence) || 0
    if (conf > 1.0) {
      conf = conf / 100.0
    }
    if (conf >= 0.90) confidenceBuckets[0].count += 1
    else if (conf >= 0.75) confidenceBuckets[1].count += 1
    else if (conf >= 0.60) confidenceBuckets[2].count += 1
    else if (conf > 0) confidenceBuckets[3].count += 1
  })

  return (
    <div className="space-y-8 max-w-[1280px]">
      {/* Header */}
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Global resolution metrics and confidence distribution benchmarks.</p>
      </div>

      {error && !overview ? (
        <EmptyState
          heading="Couldn't load data — start the backend to continue."
          body="Check that the Spring Boot server is active on port 8080."
        />
      ) : (
        <>
          {/* Top Row: 4 Stat Cards in a Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Stat 1: Total Entities */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] p-6 shadow-[var(--shadow-sm)] space-y-1">
              {loading ? (
                <div className="h-7 w-24 skeleton-flat mb-1" />
              ) : (
                <div className="font-mono text-[28px] font-bold text-[var(--text-primary)] leading-none">
                  {totalEntities.toLocaleString()}
                </div>
              )}
              <div className="font-sans text-[11px] font-semibold uppercase text-[var(--text-muted)] tracking-[0.08em] pt-1">
                TOTAL ENTITIES
              </div>
              <div className="font-sans text-[12px] font-normal text-[var(--text-muted)] pt-0.5">
                Across {completedRuns.length} pipeline runs
              </div>
            </div>

            {/* Stat 2: Listings Processed */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] p-6 shadow-[var(--shadow-sm)] space-y-1">
              {loading ? (
                <div className="h-7 w-24 skeleton-flat mb-1" />
              ) : (
                <div className="font-mono text-[28px] font-bold text-[var(--text-primary)] leading-none">
                  {totalListings.toLocaleString()}
                </div>
              )}
              <div className="font-sans text-[11px] font-semibold uppercase text-[var(--text-muted)] tracking-[0.08em] pt-1">
                LISTINGS PROCESSED
              </div>
              <div className="font-sans text-[12px] font-normal text-[var(--text-muted)] pt-0.5">
                Ingested raw catalog items
              </div>
            </div>

            {/* Stat 3: Duplicates Found */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] p-6 shadow-[var(--shadow-sm)] space-y-1">
              {loading ? (
                <div className="h-7 w-24 skeleton-flat mb-1" />
              ) : (
                <div className="font-mono text-[28px] font-bold text-[var(--text-primary)] leading-none">
                  {duplicatesFound.toLocaleString()}
                </div>
              )}
              <div className="font-sans text-[11px] font-semibold uppercase text-[var(--text-muted)] tracking-[0.08em] pt-1">
                DUPLICATES FOUND
              </div>
              <div className="font-sans text-[12px] font-normal text-[var(--text-muted)] pt-0.5">
                Merged into canonical clusters
              </div>
            </div>

            {/* Stat 4: Avg Confidence */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] p-6 shadow-[var(--shadow-sm)] space-y-1">
              {loading ? (
                <div className="h-7 w-20 skeleton-flat mb-1" />
              ) : (
                <div className="font-mono text-[28px] font-bold text-[var(--text-primary)] leading-none">
                  {avgConfidence}
                </div>
              )}
              <div className="font-sans text-[11px] font-semibold uppercase text-[var(--text-muted)] tracking-[0.08em] pt-1">
                AVG CONFIDENCE
              </div>
              <div className="font-sans text-[12px] font-normal text-[var(--text-muted)] pt-0.5">
                Mean pairwise similarity score
              </div>
            </div>
          </div>

          {/* Bottom: Two Recharts Bar Charts or Clean Empty State */}
          {completedRuns.length === 0 ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] p-12 text-center space-y-2 mt-4 shadow-[var(--shadow-sm)]">
              <div className="text-[14px] font-semibold text-[var(--text-primary)] font-sans">
                No pipeline runs yet
              </div>
              <p className="text-[13px] text-[var(--text-muted)] max-w-md mx-auto font-sans">
                No pipeline runs yet. Upload datasets and run the pipeline to see analytics.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
              {/* Left: Entities per Run */}
              <div className="space-y-1">
                <div className="font-sans text-[11px] font-semibold uppercase text-[var(--text-muted)] tracking-[0.08em] mb-3">
                  RESOLVED ENTITIES PER RUN
                </div>

                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={runsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--bg-hover)' }}
                        contentStyle={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border)',
                          borderRadius: 7,
                          fontSize: 12,
                          fontFamily: 'Inter',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <Bar dataKey="entities" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right: Confidence Distribution */}
              <div className="space-y-1">
                <div className="font-sans text-[11px] font-semibold uppercase text-[var(--text-muted)] tracking-[0.08em] mb-3">
                  MATCH CONFIDENCE DISTRIBUTION
                </div>

                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={confidenceBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="range"
                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--bg-hover)' }}
                        contentStyle={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border)',
                          borderRadius: 7,
                          fontSize: 12,
                          fontFamily: 'Inter',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AnalyticsPage
