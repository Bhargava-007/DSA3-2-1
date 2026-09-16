import React from 'react'
import { cn } from '@/lib/utils'

export type StatusBadgeVariant =
  | 'resolved'
  | 'success'
  | 'complete'
  | 'COMPLETE'
  | 'running'
  | 'processing'
  | 'RUNNING'
  | 'PROCESSING'
  | 'pending'
  | 'uploaded'
  | 'PENDING'
  | 'UPLOADED'
  | 'review'
  | 'REVIEW'
  | 'muted'
  | 'failed'
  | 'danger'
  | 'FAILED'
  | string

export interface StatusBadgeProps {
  variant?: StatusBadgeVariant
  label?: string
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = 'pending',
  label,
  className,
}) => {
  const norm = String(variant).toLowerCase()

  if (norm === 'resolved' || norm === 'success' || norm === 'complete' || norm === 'processed') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[var(--status-green-bg)] text-[var(--status-green)] text-[11px] font-medium uppercase leading-none select-none tracking-normal',
          className
        )}
      >
        <span>{label || 'Complete'}</span>
      </span>
    )
  }

  if (norm === 'running' || norm === 'processing' || norm === 'review') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[var(--status-amber-bg)] text-[var(--status-amber)] text-[11px] font-medium uppercase leading-none select-none tracking-normal',
          className
        )}
      >
        <span>{label || (norm === 'review' ? 'Review' : 'Running')}</span>
      </span>
    )
  }

  if (norm === 'failed' || norm === 'danger') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[var(--status-red-bg)] text-[var(--status-red)] text-[11px] font-medium uppercase leading-none select-none tracking-normal',
          className
        )}
      >
        <span>{label || 'Failed'}</span>
      </span>
    )
  }

  // Pending / uploaded / default
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[11px] font-medium uppercase leading-none select-none tracking-normal',
        className
      )}
    >
      {label || (norm === 'uploaded' ? 'Uploaded' : 'Pending')}
    </span>
  )
}

export default StatusBadge
