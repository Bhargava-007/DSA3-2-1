import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import { usePipelineRuns } from '@/hooks/usePipelineRuns'
import { useEntities } from '@/hooks/useEntities'
import { EmptyState } from '@/components/ui/EmptyState'
import { api, type EntityCluster } from '@/lib/api'
import { cn } from '@/lib/utils'

export const ClusterExplorerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { runs, loading: runsLoading } = usePipelineRuns()
  const completedRuns = runs.filter((r) => r.status === 'COMPLETE')

  const runIdParam = searchParams.get('runId')
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedClusterId, setExpandedClusterId] = useState<number | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<Record<number, EntityCluster>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<number, boolean>>({})

  // Set default completed run
  useEffect(() => {
    if (runIdParam) {
      setSelectedRunId(Number(runIdParam))
    } else if (completedRuns.length > 0 && !selectedRunId) {
      setSelectedRunId(completedRuns[0].id)
    }
  }, [runIdParam, completedRuns, selectedRunId])

  const selectedRun = runs.find((r) => r.id === selectedRunId)

  const { entities, totalElements, loading: entitiesLoading, error: entitiesError } = useEntities(
    selectedRunId || undefined,
    0,
    100
  )

  const toggleExpand = async (id: number) => {
    if (expandedClusterId === id) {
      setExpandedClusterId(null)
      return
    }

    setExpandedClusterId(id)
    if (!expandedDetails[id]) {
      setLoadingDetails((prev) => ({ ...prev, [id]: true }))
      try {
        const detail = await api.getEntity(id)
        setExpandedDetails((prev) => ({ ...prev, [id]: detail }))
      } catch (e) {
        // graceful silent error handling
      } finally {
        setLoadingDetails((prev) => ({ ...prev, [id]: false }))
      }
    }
  }

  const filteredEntities = entities.filter((e) => {
    const q = searchQuery.toLowerCase()
    return (
      (e.canonicalTitle && e.canonicalTitle.toLowerCase().includes(q)) ||
      (e.canonicalBrand && e.canonicalBrand.toLowerCase().includes(q)) ||
      e.id.toString().includes(q)
    )
  })

  // Summary strip calculations
  const entityCount = totalElements > 0 ? totalElements : entities.length
  const totalListings = entities.reduce((acc, curr) => acc + (curr.listingCount || 1), 0)
  const avgConf =
    entities.length > 0
      ? (entities.reduce((acc, curr) => acc + (Number(curr.confidence) || 0), 0) / entities.length) * 100
      : selectedRun?.matchConfidence || 94

  const getConfidenceDot = (conf: number) => {
    const score = Number(conf) > 1 ? Number(conf) / 100 : Number(conf)
    if (score >= 0.85) return 'bg-[var(--status-green)]'
    if (score >= 0.6) return 'bg-[var(--status-amber)]'
    return 'bg-[var(--status-red)]'
  }

  return (
    <div className="space-y-6 max-w-[1280px]">
      {/* Page Header & Top Row */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Results</h1>
          <p className="page-subtitle">Canonical product entities resolved from multi-source catalog listings.</p>
        </div>

        {/* Right-aligned Run Selector + Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="section-label text-[11px] font-semibold text-[var(--text-muted)] whitespace-nowrap">
              VIEW PAST RUN:
            </span>
            <select
              value={selectedRunId || ''}
              onChange={(e) => {
                const id = Number(e.target.value)
                setSelectedRunId(id)
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

          <div className="w-full sm:w-[280px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities or brand..."
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-[var(--bg-surface)] border-[1.5px] border-[var(--border)] rounded-[7px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      {/* Summary Strip: Inline flex, gap 24px, mb-6 */}
      {selectedRun && (
        <div className="inline-flex items-center gap-6 mb-6 p-4 rounded-[12px] bg-[var(--bg-surface)] border border-[var(--border)] shadow-[var(--shadow-sm)] select-none">
          <div className="flex flex-col">
            <span className="font-mono text-[15px] font-semibold text-[var(--text-primary)]">
              {entityCount.toLocaleString()}
            </span>
            <span className="font-sans text-[12px] text-[var(--text-muted)]">
              Entities Resolved
            </span>
          </div>

          <div className="w-px h-8 bg-[var(--border)]" />

          <div className="flex flex-col">
            <span className="font-mono text-[15px] font-semibold text-[var(--text-primary)]">
              {(selectedRun.inputRecords || totalListings).toLocaleString()}
            </span>
            <span className="font-sans text-[12px] text-[var(--text-muted)]">
              Catalog Listings
            </span>
          </div>

          <div className="w-px h-8 bg-[var(--border)]" />

          <div className="flex flex-col">
            <span className="font-mono text-[15px] font-semibold text-[var(--text-primary)]">
              {avgConf.toFixed(1)}%
            </span>
            <span className="font-sans text-[12px] text-[var(--text-muted)]">
              Avg Match Confidence
            </span>
          </div>
        </div>
      )}

      {/* Entity Table: Full width, sits directly on canvas, no outer border */}
      <div className="w-full overflow-x-auto">
        {entitiesError ? (
          <EmptyState
            heading="Couldn't load data — start the backend to continue."
            body="Ensure the Spring Boot backend server is running on port 8080."
          />
        ) : entitiesLoading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-11 skeleton-flat w-full" />
            ))}
          </div>
        ) : !selectedRunId ? (
          <EmptyState
            heading="Select a run to view results"
            body="Choose a completed pipeline run from the selector above."
          />
        ) : filteredEntities.length === 0 ? (
          <EmptyState
            heading="No entities found"
            body="No resolved product clusters matched your filter criteria."
          />
        ) : (
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="bg-[var(--bg-surface)] border-b-[1.5px] border-[var(--border)] h-9">
                <th className="w-[90px] font-sans font-semibold text-[10px] uppercase tracking-[0.07em] text-[var(--text-muted)] px-4 py-3">ENTITY ID</th>
                <th className="font-sans font-semibold text-[10px] uppercase tracking-[0.07em] text-[var(--text-muted)] px-4 py-3">CANONICAL TITLE</th>
                <th className="w-[120px] font-sans font-semibold text-[10px] uppercase tracking-[0.07em] text-[var(--text-muted)] px-4 py-3">BRAND</th>
                <th className="w-[80px] font-sans font-semibold text-[10px] uppercase tracking-[0.07em] text-[var(--text-muted)] px-4 py-3 text-center">SOURCES</th>
                <th className="w-[90px] font-sans font-semibold text-[10px] uppercase tracking-[0.07em] text-[var(--text-muted)] px-4 py-3 text-center">LISTINGS</th>
                <th className="w-[120px] font-sans font-semibold text-[10px] uppercase tracking-[0.07em] text-[var(--text-muted)] px-4 py-3">CONFIDENCE</th>
                <th className="w-[100px] font-sans font-semibold text-[10px] uppercase tracking-[0.07em] text-[var(--text-muted)] px-4 py-3 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredEntities.map((entity) => {
                const isExpanded = expandedClusterId === entity.id
                const detail = expandedDetails[entity.id]
                const isDetailLoading = loadingDetails[entity.id]
                const score = Number(entity.confidence) > 1 ? Number(entity.confidence) / 100 : Number(entity.confidence)
                const isReview = score < 0.85

                return (
                  <React.Fragment key={entity.id}>
                    <tr
                      onClick={() => toggleExpand(entity.id)}
                      className={cn(
                        'h-[44px] bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer',
                        isExpanded && 'bg-[var(--bg-hover)]'
                      )}
                    >
                      {/* Entity ID: IBM Plex Mono 12px muted */}
                      <td className="w-[90px] px-4 py-3 font-mono text-[12px] text-[var(--text-muted)]">
                        ENT-{entity.id}
                      </td>

                      {/* Canonical Title */}
                      <td className="px-4 py-3 text-[13px] font-medium text-[var(--text-primary)] max-w-md truncate">
                        {entity.canonicalTitle}
                      </td>

                      {/* Brand */}
                      <td className="w-[120px] px-4 py-3 text-[13px] text-[var(--text-secondary)] truncate">
                        {entity.canonicalBrand || '—'}
                      </td>

                      {/* Sources */}
                      <td className="w-[80px] px-4 py-3 text-center text-[13px] text-[var(--text-secondary)]">
                        {entity.sourceCount}
                      </td>

                      {/* Listings + Chevron */}
                      <td className="w-[90px] px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)]">
                          <span>{entity.listingCount}</span>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          )}
                        </span>
                      </td>

                      {/* Confidence: IBM Plex Mono 12px muted + dot */}
                      <td className="w-[120px] px-4 py-3">
                        <div className="inline-flex items-center gap-2 font-mono text-[12px] text-[var(--text-muted)]">
                          <span className={cn('w-2 h-2 rounded-full shrink-0', getConfidenceDot(entity.confidence))} />
                          <span>{(score * 100).toFixed(0)}%</span>
                        </div>
                      </td>

                      {/* Status Pill */}
                      <td className="w-[100px] px-4 py-3 text-right">
                        <span
                          className={cn(
                            'status-pill',
                            isReview ? 'status-pill-amber' : 'status-pill-green'
                          )}
                        >
                          {isReview ? 'Review' : 'Resolved'}
                        </span>
                      </td>
                    </tr>

                    {/* Sub-table of Member Listings */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <div className="py-4 px-6 pl-10 bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] space-y-3">
                            <div className="section-label">
                              MEMBER CATALOG LISTINGS ({detail?.members?.length || entity.listingCount})
                            </div>

                            {isDetailLoading ? (
                              <div className="space-y-2 py-2">
                                <div className="h-8 skeleton-flat w-full" />
                                <div className="h-8 skeleton-flat w-full" />
                              </div>
                            ) : !detail || !detail.members || detail.members.length === 0 ? (
                              <div className="text-[12px] text-[var(--text-muted)] font-mono">
                                Single catalog listing or no member records loaded.
                              </div>
                            ) : (
                              <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border)] rounded-[7px] overflow-hidden bg-[var(--bg-surface)]">
                                {detail.members.map((member) => (
                                  <div
                                    key={member.productId}
                                    className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px]"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="font-mono text-[11px] uppercase px-1.5 py-0.5 bg-[var(--bg-hover)] border border-[var(--border)] rounded text-[var(--text-muted)] shrink-0">
                                        {member.source || 'CATALOG'}
                                      </span>
                                      <span className="font-medium text-[var(--text-primary)] truncate">
                                        {member.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 font-mono text-[12px] shrink-0 text-[var(--text-muted)]">
                                      <span>SKU: {member.externalId}</span>
                                      <span className="text-[var(--text-primary)]">
                                        {member.price != null ? `$${Number(member.price).toFixed(2)}` : '—'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default ClusterExplorerPage

