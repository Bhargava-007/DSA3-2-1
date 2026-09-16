import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useCache } from '@/context/CacheContext'
import { api } from '@/lib/api'
import { AlertTriangle, Trash2, Loader2, CheckCircle2 } from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { invalidateAll } = useCache()

  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.85)
  const [minEdgeSimilarity, setMinEdgeSimilarity] = useState<number>(0.75)
  const [canonicalStrategy, setCanonicalStrategy] = useState<string>('most_complete')
  const [saved, setSaved] = useState<boolean>(false)

  // Clear data modal state
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false)
  const [clearing, setClearing] = useState<boolean>(false)
  const [clearSuccess, setClearSuccess] = useState<boolean>(false)
  const [clearError, setClearError] = useState<string | null>(null)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleClearAllData = async () => {
    setClearing(true)
    setClearError(null)
    try {
      invalidateAll()
      await api.clearAllData()
      setClearSuccess(true)
      setTimeout(() => {
        setIsClearModalOpen(false)
        setClearSuccess(false)
        navigate('/upload')
      }, 300)
    } catch (err: any) {
      setClearError(err?.message || 'Failed to clear platform data from database. Make sure backend is running.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-8 max-w-[800px]">
      {/* Header */}
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure resolution thresholds, matching sensitivity, and entity clustering rules.</p>
      </div>

      {/* Card 1: Matching Threshold */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] p-6 sm:p-8 shadow-[var(--shadow-sm)] space-y-6">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] font-sans">
            Matching Threshold
          </h3>
          <p className="text-[13px] font-normal text-[var(--text-muted)] font-sans mt-1">
            Lower values find more matches. Higher values are stricter.
          </p>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium text-[var(--text-primary)] font-sans">
              Similarity Threshold
            </label>
            <span className="font-mono text-[13px] text-[var(--text-muted)]">
              {Number(similarityThreshold).toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.50"
              max="0.99"
              step="0.01"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
              className="w-full accent-[var(--accent)] cursor-pointer h-1.5 bg-[var(--bg-canvas)] rounded-lg border border-[var(--border)]"
            />
            <input
              type="number"
              min="0.50"
              max="0.99"
              step="0.01"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
              className="w-20 text-center font-mono text-[12px] bg-[var(--bg-surface)] border-[1.5px] border-[var(--border)] rounded-[7px] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      {/* Card 2: Clustering */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] p-6 sm:p-8 shadow-[var(--shadow-sm)] space-y-6">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] font-sans">
            Clustering
          </h3>
          <p className="text-[13px] font-normal text-[var(--text-muted)] font-sans mt-1">
            Parameters for grouping matched catalog listings into single canonical entities.
          </p>
        </div>

        <div className="space-y-5 pt-2">
          {/* Min edge similarity */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="text-[13px] font-medium text-[var(--text-primary)] font-sans">
                Minimum Edge Similarity
              </label>
              <p className="text-[12px] font-normal text-[var(--text-muted)] font-sans mt-0.5">
                Minimum pairwise score required to form a cluster connection.
              </p>
            </div>
            <input
              type="number"
              min="0.50"
              max="0.99"
              step="0.01"
              value={minEdgeSimilarity}
              onChange={(e) => setMinEdgeSimilarity(Number(e.target.value))}
              className="w-24 text-center font-mono text-[12px] bg-[var(--bg-surface)] border-[1.5px] border-[var(--border)] rounded-[7px] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="h-px bg-[var(--border-subtle)]" />

          {/* Canonical record strategy */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="text-[13px] font-medium text-[var(--text-primary)] font-sans">
                Canonical Record Strategy
              </label>
              <p className="text-[12px] font-normal text-[var(--text-muted)] font-sans mt-0.5">
                Rule used to select the primary title and brand for the resolved entity.
              </p>
            </div>
            <select
              value={canonicalStrategy}
              onChange={(e) => setCanonicalStrategy(e.target.value)}
              className="text-[13px] font-sans bg-[var(--bg-surface)] border-[1.5px] border-[var(--border)] rounded-[7px] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="most_complete">Most complete record</option>
              <option value="highest_price">Highest trusted source</option>
              <option value="longest_title">Longest descriptive title</option>
              <option value="most_frequent">Most frequent brand name</option>
            </select>
          </div>
        </div>

        {/* Action Button: Right-aligned */}
        <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[12px] font-mono text-[var(--status-green)]">
            {saved ? '✓ Settings applied successfully' : ''}
          </span>
          <Button onClick={handleSave} className="btn-primary ml-auto">
            Apply Settings
          </Button>
        </div>
      </div>

      {/* Card 3: Danger Zone - Clear All Data */}
      <div className="bg-[var(--bg-surface)] border border-[var(--status-red)]/30 rounded-[12px] p-6 sm:p-8 shadow-[var(--shadow-sm)] space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--status-red)] font-sans flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-[var(--status-red)] shrink-0" />
              Clear All Platform Data
            </h3>
            <p className="text-[13px] font-normal text-[var(--text-secondary)] font-sans mt-1 leading-relaxed">
              Permanently delete all ingested catalog datasets, extracted products, candidate pairs, resolved clusters, and historical pipeline execution runs from Supabase PostgreSQL.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-[12px] text-[var(--text-muted)] font-mono">
            Irreversible database wipe
          </span>
          <Button
            type="button"
            onClick={() => setIsClearModalOpen(true)}
            className="bg-[var(--status-red)] hover:bg-[var(--status-red)]/90 text-white font-medium text-[13px] px-4 py-2 rounded-[7px] transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isClearModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !clearing) {
              setIsClearModalOpen(false)
              setClearError(null)
            }
          }}
        >
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--status-red)]/10 flex items-center justify-center shrink-0">
                {clearSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-[var(--status-green)]" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-[var(--status-red)]" />
                )}
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">
                  {clearSuccess ? 'Database Wiped Successfully' : 'Clear All Data?'}
                </h3>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  {clearSuccess
                    ? 'All catalog datasets, extracted products, matches, and clusters have been cleared. Redirecting to Upload...'
                    : 'This will permanently delete all datasets, products, candidate matches, clusters, and pipeline runs from the database and reset the in-memory cache. This action cannot be undone.'}
                </p>
              </div>
            </div>

            {clearError && (
              <div className="p-3 bg-[var(--status-red)]/10 border border-[var(--status-red)]/30 rounded-[7px] text-[12px] text-[var(--status-red)] font-medium">
                {clearError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsClearModalOpen(false)
                  setClearError(null)
                }}
                disabled={clearing}
                className="btn-outlined text-[13px]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleClearAllData}
                disabled={clearing || clearSuccess}
                className="bg-[var(--status-red)] hover:bg-[var(--status-red)]/90 text-white font-medium text-[13px] px-4 py-2 rounded-[7px] transition-colors cursor-pointer flex items-center gap-2"
              >
                {clearing && <Loader2 className="w-4 h-4 animate-spin" />}
                {clearing
                  ? 'Wiping Database...'
                  : clearSuccess
                  ? 'Redirecting...'
                  : clearError
                  ? 'Retry Wipe'
                  : 'Yes, Wipe Everything'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage


