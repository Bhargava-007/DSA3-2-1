import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error = false, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-[7px] border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors duration-150 ease-out",
          error
            ? "border-[var(--status-red)] focus-visible:border-[var(--status-red)]"
            : "focus-visible:border-[var(--accent)]",
          "focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-[var(--bg-canvas)] disabled:text-[var(--text-muted)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
