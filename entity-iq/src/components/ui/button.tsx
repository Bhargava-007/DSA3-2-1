import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[7px] text-[13px] font-medium transition-colors duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed select-none cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:bg-[var(--border)] disabled:text-[var(--text-muted)]",
        outline:
          "border-[1.5px] border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:text-[var(--text-muted)]",
        secondary:
          "bg-[var(--bg-surface)] border-[1.5px] border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:text-[var(--text-muted)]",
        ghost:
          "text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:text-[var(--text-muted)]",
        destructive:
          "bg-[var(--status-red)] text-white hover:bg-red-700 disabled:bg-[var(--border)] disabled:text-[var(--text-muted)]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-[12px]",
        lg: "h-10 px-6 text-[14px]",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span
            className="inline-block size-3 rounded-full border-2 border-current border-t-transparent animate-spin mr-1 shrink-0"
            style={{ animationDuration: '800ms' }}
          />
        )}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
