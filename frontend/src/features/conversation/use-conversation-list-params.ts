import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import type { ConversationListQuery } from '@/schemas/conversation'

/** 会话列表每页条数，与后端 size 上限（50）内取值 */
export const CONVERSATION_PAGE_SIZE = 20

const SEARCH_DEBOUNCE_MS = 300

/** 可写入 URL 的键；值为 null 表示删除该键（默认值不落 URL） */
type ConversationListPatch = Partial<Record<'keyword' | 'page', string | null>>

interface ConversationListParams {
  keyword: string
  page: number
}

function readParams(searchParams: URLSearchParams): ConversationListParams {
  const pageRaw = Number.parseInt(searchParams.get('page') ?? '', 10)
  return {
    keyword: searchParams.get('keyword') ?? '',
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  }
}

function writeParams(current: URLSearchParams, patch: ConversationListPatch): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') next.delete(key)
    else next.set(key, value)
  }
  return next
}

/**
 * 会话列表的 URL 状态，沿用课程列表（PAD §6.1 v0.3）的约定：
 * 关键词防抖后 `replace` 写 URL、翻页 `push`；且只有「外部」变化才回灌输入框，
 * 避免后退/前进抹掉 keyword 后又被本地旧值写回。
 */
export function useConversationListParams() {
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
    (patch: ConversationListPatch, options?: { replace?: boolean }) => {
      setSearchParams((current) => writeParams(current, patch), {
        replace: options?.replace ?? false,
      })
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (selfWrittenKeywordRef.current === params.keyword) return
    selfWrittenKeywordRef.current = params.keyword
    cancelPendingKeyword()
    setKeywordInput(params.keyword)
  }, [params.keyword, cancelPendingKeyword])

  useEffect(() => cancelPendingKeyword, [cancelPendingKeyword])

  const setKeyword = useCallback(
    (value: string) => {
      setKeywordInput(value)
      cancelPendingKeyword()
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        selfWrittenKeywordRef.current = value
        commit({ keyword: value === '' ? null : value, page: null }, { replace: true })
      }, SEARCH_DEBOUNCE_MS)
    },
    [cancelPendingKeyword, commit],
  )

  const query = useMemo<ConversationListQuery>(
    () => ({
      page: params.page,
      size: CONVERSATION_PAGE_SIZE,
      ...(params.keyword === '' ? {} : { keyword: params.keyword }),
    }),
    [params.page, params.keyword],
  )

  return { params, query, keywordInput, setKeywordInput: setKeyword, commit }
}
