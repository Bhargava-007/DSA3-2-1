import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[4px] bg-[var(--bg-hover)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
