import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  heading?: string
  body?: string
  action?: {
    label: string
    onClick?: () => void
    to?: string
  }
  footerNote?: string
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  heading,
  body,
  action,
  className,
}) => {
  const displayText = body || heading || 'No items to display'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6 select-none',
        className
      )}
    >
      {/* 32x32 Geometric Icon (stroke, no fill) */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="stroke-[var(--text-muted)] mb-3"
      >
        <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.5" />
        <rect x="12" y="12" width="16" height="16" rx="2" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>

      {/* One line text */}
      <p className="text-[14px] text-[var(--text-secondary)] max-w-sm">
        {displayText}
      </p>

      {/* One Action button below if applicable */}
      {action && (
        <div className="mt-4">
          {action.to ? (
            <a href={action.to}>
              <Button className="btn-primary">
                {action.label}
              </Button>
            </a>
          ) : (
            <Button
              onClick={action.onClick}
              className="btn-primary"
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
