import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]",
        secondary: "border-[var(--border)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]",
        destructive: "border-[var(--status-red)]/20 bg-[var(--status-red-bg)] text-[var(--status-red)]",
        outline: "border-[var(--border)] text-[var(--text-primary)]",
        success: "border-[var(--status-green)]/20 bg-[var(--status-green-bg)] text-[var(--status-green)]",
        accent: "border-[var(--accent)]/20 bg-[var(--bg-active)] text-[var(--accent)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
