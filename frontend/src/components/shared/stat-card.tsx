import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  /** 补充说明（如占比、口径） */
  hint?: string
  className?: string
}

/** 指标卡片（PAD §6.3 自定义业务组件）：统计页与后续概览页复用 */
export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <div className={cn('space-y-1 rounded-xl border border-border p-3', className)}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-semibold text-xl tabular-nums">{value}</p>
      {hint === undefined ? null : <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  )
}
