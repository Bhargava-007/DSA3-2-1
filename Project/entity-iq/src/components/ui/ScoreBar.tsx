import React from 'react'
import { cn } from '@/lib/utils'

export interface ScoreBarProps {
  label?: string
  value: number // 0-1 or 0-100
  showPercent?: boolean
  bold?: boolean
  className?: string
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  label,
  value,
  showPercent = true,
  bold = false,
  className,
}) => {
  const normValue = value > 1 ? value : value * 100
  const clamped = Math.max(0, Math.min(100, normValue))

  return (
    <div className={cn('w-full flex items-center gap-3 select-none', className)}>
      {label && (
        <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em] min-w-[140px] shrink-0 font-sans">
          {label}
        </span>
      )}
      {showPercent && (
        <span
          className={cn(
            'font-mono text-[13px] tabular-nums min-w-[50px] shrink-0',
            bold ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-primary)]'
          )}
        >
          {clamped.toFixed(1)}%
        </span>
      )}
      <div className="flex-1 h-1.5 bg-[var(--border)] rounded-[2px] overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-[2px] transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
