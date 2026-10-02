import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/**
 * URL 分页参数（PAD §6.1 v0.3 约定）：
 * - `page` 是当前页码的唯一事实源 → 可分享、刷新保持、从详情返回不丢页码
 * - 第 1 页属默认值，不写入 URL，保持链接干净
 * - 翻页用 `push`，后退键可逐页回退
 */
export function usePageParam(defaultPage = 1) {
  const [searchParams, setSearchParams] = useSearchParams()

  const raw = Number.parseInt(searchParams.get('page') ?? '', 10)
  const page = Number.isFinite(raw) && raw > 0 ? raw : defaultPage

  const setPage = useCallback(
    (next: number) => {
      setSearchParams((current) => {
        const nextParams = new URLSearchParams(current)
        if (next <= 1) nextParams.delete('page')
        else nextParams.set('page', String(next))
        return nextParams
      })
    },
    [setSearchParams],
  )

  const resetPage = useCallback(() => setPage(1), [setPage])

  return { page, setPage, resetPage }
}
