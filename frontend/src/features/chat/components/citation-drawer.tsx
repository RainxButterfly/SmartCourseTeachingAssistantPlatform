import { XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Citation } from '@/schemas/conversation'
import { useUiStore } from '@/stores/ui-store'

/** 与 Tailwind xl 断点保持一致（80rem）：达不到 xl 时右栏改用浮层抽屉，避免挤压中栏 */
const XL_QUERY = '(max-width: 79.999rem)'

/** 是否窄屏（< xl）：窄屏用浮层抽屉，宽屏用右侧栏 */
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(XL_QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(XL_QUERY)
    const handleChange = (): void => setNarrow(mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return narrow
}

function CitationDetail({ citation }: { citation: Citation }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs tabular-nums">引用 [{citation.index}]</p>
        <p className="font-medium text-sm">{citation.title}</p>
        <div className="flex flex-wrap items-center gap-2">
          {citation.page > 0 ? (
            <Badge variant="outline" className="tabular-nums">
              第 {citation.page} 页
            </Badge>
          ) : null}
          {citation.score === undefined ? null : (
            <Badge variant="secondary" className="tabular-nums">
              相关度 {citation.score.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>

      {/* 左侧色条即「高亮段落」的视觉表达：回答所依据的原文片段 */}
      <div className="rounded-lg border border-border border-l-2 border-l-primary bg-muted/40 p-3">
        <p className="text-muted-foreground text-xs">原文摘录</p>
        <p className="mt-1 text-pretty text-sm">{citation.snippet}</p>
      </div>
    </div>
  )
}

/**
 * 引用详情（PAD §6.2 ChatPage 右栏）：
 * 宽屏（≥ xl，1280px）才作为右侧栏出现 —— 否则三栏并排会把中栏压到不可用宽度；
 * 更窄时为右侧浮层抽屉，不改变中栏宽度。
 */
export function CitationDrawer() {
  const activeCitation = useUiStore((state) => state.activeCitation)
  const closeCitation = useUiStore((state) => state.closeCitation)
  const isNarrow = useIsNarrow()

  return (
    <>
      {activeCitation === null || isNarrow ? null : (
        <aside
          aria-label="引用详情"
          className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-border p-4 xl:flex"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-medium text-sm">引用详情</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="关闭引用详情"
              onClick={closeCitation}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>
          <CitationDetail citation={activeCitation} />
        </aside>
      )}

      {isNarrow ? (
        <Sheet
          open={activeCitation !== null}
          onOpenChange={(open) => {
            if (!open) closeCitation()
          }}
        >
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>引用详情</SheetTitle>
              <SheetDescription className="sr-only">
                展示引用资料的名称、页码与原文摘录
              </SheetDescription>
            </SheetHeader>
            {activeCitation === null ? null : (
              <div className="px-4 pb-4">
                <CitationDetail citation={activeCitation} />
              </div>
            )}
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  )
}
