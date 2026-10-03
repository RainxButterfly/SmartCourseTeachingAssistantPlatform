import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface FieldShellProps {
  id: string
  label: string
  error?: string | undefined
  hint?: string | undefined
  children: ReactNode
  className?: string
}

/**
 * 统一的「标签 + 控件 + 错误/提示」外壳（PAD §6.5）。
 * 负责 label / aria-describedby / role=alert 的接线，供各表单复用。
 * 约定：错误节点 id 为 `${id}-error`，提示节点 id 为 `${id}-hint`。
 */
export function FieldShell({ id, label, error, hint, children, className }: FieldShellProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="font-medium text-sm">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** 有错误时指向错误节点，否则指向提示节点（id 由 FieldShell 约定派生） */
export function describeField(fieldId: string, hasError: boolean): string {
  return hasError ? `${fieldId}-error` : `${fieldId}-hint`
}
