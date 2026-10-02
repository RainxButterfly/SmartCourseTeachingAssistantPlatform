import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import type { CourseScope } from '@/features/course/components/course-list-filters'
import type { CourseListQuery, CourseSort } from '@/schemas/course'

/** 课程列表每页条数，与后端 size 上限（50）内取值 */
export const COURSE_PAGE_SIZE = 12

const SORT_VALUES: readonly CourseSort[] = ['recent', 'name', 'created']
const DEFAULT_SORT: CourseSort = 'recent'
const SEARCH_DEBOUNCE_MS = 300

/** 可写入 URL 的键；值为 null 表示删除该键（默认值不落 URL） */
type CourseListPatch = Partial<
  Record<'keyword' | 'scope' | 'semester' | 'sort' | 'page', string | null>
>

interface CourseListParams {
  keyword: string
  scope: CourseScope
  semester: string
  sort: CourseSort
  page: number
}

function readParams(searchParams: URLSearchParams): CourseListParams {
  const sortRaw = searchParams.get('sort')
  const pageRaw = Number.parseInt(searchParams.get('page') ?? '', 10)

  return {
    keyword: searchParams.get('keyword') ?? '',
    scope: searchParams.get('scope') === 'mine' ? 'mine' : 'all',
    semester: searchParams.get('semester') ?? '',
    sort: SORT_VALUES.find((item) => item === sortRaw) ?? DEFAULT_SORT,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  }
}

function writeParams(current: URLSearchParams, patch: CourseListPatch): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') next.delete(key)
    else next.set(key, value)
  }
  return next
}

/**
 * 课程列表的 URL 状态（PAD §6.1 v0.3 决策）：
 * - URL 是筛选与分页的单一事实源 → 可分享、刷新保持、从详情页返回不丢筛选
 * - 搜索关键词：本地 state 保证输入手感，防抖后用 `replace` 写入 URL，不产生历史记录
 * - 离散筛选与翻页：`push`，后退键可逐级回退
 *
 * 关键词的双向同步刻意不用「监听防抖值」的写法：那种写法在后退/前进把 URL 里的
 * keyword 抹掉后，会立刻把本地旧值写回 URL，导致地址栏与浏览器历史不同步。
 * 因此这里用 ref 区分「本 hook 写入」与「外部变化（后退/前进/外链）」：
 * 只有外部变化才回灌输入框，且会丢弃尚未落地的待写入。
 */
export function useCourseListParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = readParams(searchParams)

  const [keywordInput, setKeywordInput] = useState(() => params.keyword)
  const selfWrittenKeywordRef = useRef(params.keyword)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelPendingKeyword = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [])

  const commit = useCallback(
    (patch: CourseListPatch, options?: { replace?: boolean }) => {
      setSearchParams((current) => writeParams(current, patch), {
        replace: options?.replace ?? false,
      })
    },
    [setSearchParams],
  )

  // URL 的关键词发生「外部」变化 → 回灌输入框，并丢弃待写入
  useEffect(() => {
    if (selfWrittenKeywordRef.current === params.keyword) return
    selfWrittenKeywordRef.current = params.keyword
    cancelPendingKeyword()
    setKeywordInput(params.keyword)
  }, [params.keyword, cancelPendingKeyword])

  // 卸载时清掉未触发的定时器
  useEffect(() => cancelPendingKeyword, [cancelPendingKeyword])

  const setKeyword = useCallback(
    (value: string) => {
      setKeywordInput(value)
      cancelPendingKeyword()
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        // 先记录，再写 URL：这样紧随其后的 params 变化不会被误判为外部变化
        selfWrittenKeywordRef.current = value
        commit({ keyword: value === '' ? null : value, page: null }, { replace: true })
      }, SEARCH_DEBOUNCE_MS)
    },
    [cancelPendingKeyword, commit],
  )

  const query = useMemo<CourseListQuery>(() => {
    return {
      page: params.page,
      size: COURSE_PAGE_SIZE,
      sort: params.sort,
      ...(params.keyword === '' ? {} : { keyword: params.keyword }),
      ...(params.scope === 'mine' ? { mine: true } : {}),
      ...(params.semester === '' ? {} : { semester: params.semester }),
    }
  }, [params.page, params.keyword, params.scope, params.semester, params.sort])

  const hasActiveFilters =
    params.keyword !== '' || params.scope === 'mine' || params.semester !== ''

  const clearFilters = useCallback(() => {
    cancelPendingKeyword()
    selfWrittenKeywordRef.current = ''
    setKeywordInput('')
    commit(
      { keyword: null, scope: null, semester: null, sort: null, page: null },
      { replace: true },
    )
  }, [cancelPendingKeyword, commit])

  return {
    params,
    query,
    keywordInput,
    setKeywordInput: setKeyword,
    hasActiveFilters,
    clearFilters,
    commit,
  }
}
