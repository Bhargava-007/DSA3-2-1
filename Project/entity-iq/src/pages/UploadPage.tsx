import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Trash2, FileText, AlertTriangle, Layers } from 'lucide-react'
import { useDatasets } from '@/hooks/useDatasets'
import { useOverviewStats } from '@/hooks/useOverviewStats'
import { useCache } from '@/context/CacheContext'
import { api, type Dataset } from '@/lib/api'
import { cn } from '@/lib/utils'

export const UploadPage: React.FC = () => {
  const navigate = useNavigate()
  const { invalidate } = useCache()
  const { datasets, setDatasets, loading, error, refetch } = useDatasets()
  const { data: stats } = useOverviewStats()
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const totalDatasetRecords = datasets.reduce((sum, d) => sum + (d.recordCount || 0), 0)
  const totalProductsInDb = stats?.totalListings || 0
  const hasRecordMismatch = datasets.length > 0 && totalProductsInDb > totalDatasetRecords

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0])
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setActionNotice(null)
    try {
      await api.uploadDataset(file)
      invalidate('datasets')
      invalidate('stats')
      await refetch()
    } catch {
      setActionNotice("Couldn't complete upload — verify the backend connection.")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    const prev = datasets
    // Instantly remove from UI in 0ms
    setDatasets((current) => current.filter((d) => d.id !== id))
    try {
      await api.deleteDataset(id)
      invalidate('datasets')
      invalidate('stats')
      invalidate('runs')
    } catch {
      // Revert if backend error occurs
      setDatasets(prev)
      setActionNotice("Couldn't delete catalog file.")
    }
  }

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-8 max-w-[1280px]">
      {/* Page Header */}
      <div>
        <h1 className="page-title">Catalog</h1>
        <p className="page-subtitle">Ingest and manage multi-source product catalog files for cross-dataset resolution.</p>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border)] text-[13px] text-[var(--text-secondary)] font-medium flex items-center justify-between shadow-[var(--shadow-sm)]">
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Discrepancy Warning Banner */}
      {hasRecordMismatch && (
        <div className="p-4 bg-[var(--status-amber-bg)] border border-[var(--status-amber)]/30 rounded-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px] text-[var(--status-amber)] shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Catalog Database Discrepancy Detected: </span>
              <span>
                Database has {totalProductsInDb.toLocaleString()} records, but currently active catalogs total {totalDatasetRecords.toLocaleString()} items (orphaned records from previous runs).
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

      {/* Upload Complete / Cross-Dataset Pipeline Trigger Card */}
      {datasets.length > 0 && (
        <div className="p-5 rounded-[12px] bg-[var(--bg-surface)] border border-[var(--accent)]/30 shadow-[var(--shadow-sm)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-[var(--text-primary)] font-sans">
                Upload complete ({datasets.length} datasets, {totalDatasetRecords.toLocaleString()} total products)
              </div>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 font-sans">
                Go to Pipeline to run cross-dataset entity matching across all uploaded datasets simultaneously.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/pipeline')}
            className="btn-primary shrink-0 inline-flex items-center gap-2 text-[13px] whitespace-nowrap"
          >
            Go to Pipeline →
          </Button>
        </div>
      )}

      {/* Upload Zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
        className={cn(
          'block p-12 rounded-[12px] border-2 border-dashed transition-all duration-200 text-center cursor-pointer select-none',
          dragOver
            ? 'border-[var(--accent)] bg-[var(--bg-active)]'
            : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--accent)] hover:bg-[var(--bg-active)]'
        )}
      >
        <input
          type="file"
          accept=".csv"
          className="hidden"
          disabled={uploading}
          onChange={handleFileSelect}
        />
        <div className="flex flex-col items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-colors duration-200"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>

          <span className="text-[14px] font-medium text-[var(--text-primary)] font-sans mt-3">
            {uploading ? 'Uploading catalog file...' : 'Drop a CSV catalog here or click to browse'}
          </span>
          <p className="text-[12px] font-normal text-[var(--text-muted)] font-sans mt-1">
            Supports CSV with title, brand, price, category, and description fields
          </p>
        </div>
      </label>

      {/* Catalog Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="section-label">UPLOADED CATALOGS</span>
          <span className="font-mono text-[12px] text-[var(--text-muted)]">
            {datasets.length} files ({totalDatasetRecords.toLocaleString()} items)
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 skeleton-flat" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            heading="Couldn't load data — start the backend to continue."
            body="Ensure the backend server is running on port 8080."
          />
        ) : datasets.length === 0 ? (
          <EmptyState
            heading="No catalogs uploaded yet"
            body="Use the upload zone above to add your first product catalog CSV."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {datasets.map((dataset: Dataset) => (
              <div
                key={dataset.id}
                className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] p-5 shadow-[var(--shadow-sm)] flex flex-col justify-between hover:shadow-[var(--shadow-md)] hover:-translate-y-[1px] transition-all duration-150"
              >
                <div className="space-y-3">
                  {/* Top Row: Icon, Filename, Delete */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-medium text-[var(--text-primary)] truncate font-sans" title={dataset.filename}>
                          {dataset.filename}
                        </h4>
                        <span className="font-mono text-[12px] text-[var(--text-muted)]">
                          {formatTimestamp(dataset.uploadedAt)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, dataset.id)}
                      className="text-[var(--text-muted)] hover:text-[var(--status-red)] p-1 rounded transition-colors cursor-pointer"
                      title="Delete catalog"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Middle: Badges / Date + Record Count */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-[12px] text-[var(--text-muted)]">
                      {dataset.recordCount?.toLocaleString() ?? 0} records
                    </span>
                    <StatusBadge
                      variant={dataset.status === 'COMPLETE' ? 'success' : dataset.status === 'UPLOADED' ? 'processed' : dataset.status}
                      label={dataset.status === 'COMPLETE' ? 'PROCESSED' : dataset.status}
                    />
                  </div>
                </div>

                {/* Bottom: Status Strip */}
                <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
                  <span>Ready for cross-matching</span>
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">{(dataset.fileSizeMb || 0)} MB</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadPage

