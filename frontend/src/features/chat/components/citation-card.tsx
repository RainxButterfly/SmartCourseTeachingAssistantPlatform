import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Citation } from '@/schemas/conversation'
import { useUiStore } from '@/stores/ui-store'

interface CitationCardProps {
  citation: Citation
  /** 是否提供「详情」（打开引用抽屉）；练习结果页无抽屉，传 false */
  showDetail?: boolean
}

/** 引用卡片（PAD §6.2）：文档名 + 页码 chip + 原文摘录（可展开），并可打开详情抽屉 */
export function CitationCard({ citation, showDetail = true }: CitationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const openCitation = useUiStore((state) => state.openCitation)

  return (
    <div className="rounded-lg border border-border bg-background/70 p-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge variant="secondary" className="tabular-nums">
          [{citation.index}]
        </Badge>
        <span className="min-w-0 max-w-full truncate text-xs font-medium" title={citation.title}>
          {citation.title}
        </span>
        {citation.page > 0 ? (
          <Badge variant="outline" className="tabular-nums">
            第 {citation.page} 页
          </Badge>
        ) : null}
      </div>

      {citation.snippet === '' ? null : (
        <p
          className={cn(
            'mt-1.5 text-pretty text-muted-foreground text-xs',
            expanded ? '' : 'line-clamp-2',
          )}
        >
          {citation.snippet}
        </p>
      )}

      <div className="-ml-1.5 mt-1 flex items-center gap-1">
        {citation.snippet === '' ? null : (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? '收起原文' : '展开原文'}
            <ChevronDown
              aria-hidden="true"
              className={cn('transition-transform', expanded ? 'rotate-180' : '')}
            />
          </Button>
        )}
        {showDetail ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            aria-label={`查看引用 ${citation.index} 详情`}
            onClick={() => openCitation(citation)}
          >
            <ChevronRight aria-hidden="true" />
            详情
          </Button>
        ) : null}
      </div>
    </div>
  )
}
