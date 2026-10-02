import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  fetchQuizAttempts,
  fetchQuizResult,
  fetchWeakPoints,
  generateQuiz,
  submitQuiz,
} from '@/features/quiz/api'
import { resolveErrorMessage } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import type { QuizAttemptListQuery, QuizGenerateBody, QuizSubmitBody } from '@/schemas/quiz'

/** 薄弱知识点：随作答变化，但一次会话内不必频繁重取 */
export function useWeakPointsQuery(courseId: number) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.quiz.weakPoints(courseId),
      queryFn: () => fetchWeakPoints(courseId),
      staleTime: 60_000,
    }),
  )
}

/** 练习记录：一次取最近 5 条 */
export function useQuizAttemptsQuery(query: QuizAttemptListQuery) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.quiz.attempts(query),
      queryFn: () => fetchQuizAttempts(query),
    }),
  )
}

/** 结果页：支持直接深链与刷新进入 */
export function useQuizResultQuery(attemptId: number) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.quiz.attempt(attemptId),
      queryFn: () => fetchQuizResult(attemptId),
      enabled: Number.isFinite(attemptId) && attemptId > 0,
    }),
  )
}

export function useGenerateQuizMutation() {
  return useMutation({
    mutationFn: (body: QuizGenerateBody) => generateQuiz(body),
    onError: (error) => {
      toast.error(resolveErrorMessage(error))
    },
  })
}

/** 交卷：结果直接进缓存，结果页无需再请求一次 */
export function useSubmitQuizMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: QuizSubmitBody) => submitQuiz(body),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.quiz.attempt(result.attempt_id), result)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quiz.attempts({ page: 1, size: 5 }),
      })
      void queryClient.invalidateQueries({ queryKey: ['quiz', 'weak-points'] })
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error))
    },
  })
}
