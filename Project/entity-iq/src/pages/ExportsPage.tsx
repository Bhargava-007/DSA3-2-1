import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'
import { usePipelineRuns } from '@/hooks/usePipelineRuns'
import { api } from '@/lib/api'

export const ExportsPage: React.FC = () => {
  const { runs, loading: runsLoading } = usePipelineRuns()
  const completedRuns = runs.filter((r) => r.status === 'COMPLETE' || r.entitiesFormed > 0)

  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [lastExportTime, setLastExportTime] = useState<string | null>(() => {
    return localStorage.getItem('resolve-last-export') || null
  })

  useEffect(() => {
    if (completedRuns.length > 0 && !selectedRunId) {
      setSelectedRunId(completedRuns[0].id)
    }
  }, [completedRuns, selectedRunId])

  const recordExport = () => {
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLastExportTime(now)
    localStorage.setItem('resolve-last-export', now)
  }

  const handleExportClusters = () => {
    if (!selectedRunId) return
    recordExport()
    api.exportClusters(selectedRunId)
  }

  const handleExportPairs = () => {
    if (!selectedRunId) return
    recordExport()
    api.exportPairs(selectedRunId)
  }

  return (
    <div className="space-y-8 max-w-[1280px]">
      {/* Header */}
      <div>
        <h1 className="page-title">Export</h1>
        <p className="page-subtitle">Download resolved product entities and matched pairs as standard CSV files.</p>
      </div>

      {/* Centered Single Card: max-w-480px, padding 32px */}
      <div className="flex justify-center pt-4">
        <div className="card-surface w-full max-w-[480px] p-8 space-y-6">
          <div>
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">
              Export Results
            </h2>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              Select a pipeline run to generate and download CSV data exports.
            </p>
          </div>

          {/* Run Selector Dropdown */}
          <div className="space-y-2">
            <label className="section-label text-[11px] font-semibold text-[var(--text-muted)]">
              SELECT RUN TO EXPORT
            </label>
            {runsLoading ? (
              <div className="h-10 skeleton-flat w-full" />
            ) : completedRuns.length === 0 ? (
              <div className="p-3 bg-[var(--bg-canvas)] border border-[var(--border)] rounded-[7px] text-[13px] text-[var(--text-muted)]">
                No completed runs available.
              </div>
            ) : (
              <select
                value={selectedRunId || ''}
                onChange={(e) => setSelectedRunId(Number(e.target.value))}
                className="w-full font-mono text-[12px] bg-[var(--bg-canvas)] border border-[var(--border)] rounded-[7px] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
              >
                {completedRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    RUN-{r.id} — {r.datasetFilename || `Dataset #${r.datasetId}`} ({r.entitiesFormed || 0} entities)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Stacked Export Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleExportClusters}
              disabled={!selectedRunId}
              className="btn-primary w-full h-10 text-[13px] flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Entities CSV
            </Button>

            <Button
              onClick={handleExportPairs}
              disabled={!selectedRunId}
              className="w-full h-10 text-[13px] border-[1.5px] border-[var(--border)] text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-hover)] rounded-[7px] font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Download Matches CSV
            </Button>
          </div>

          {/* Last Export Timestamp */}
          <div className="pt-2 text-center">
            <span className="font-mono text-[12px] text-[var(--text-muted)]">
              Last export: {lastExportTime ? lastExportTime : 'never'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportsPage
