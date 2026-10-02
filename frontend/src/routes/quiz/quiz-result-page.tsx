import { CircleCheck, TriangleAlert } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'

import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CitationCard } from '@/features/chat/components/citation-card'
import { useQuizResultQuery } from '@/features/quiz/queries'
import { resolveErrorMessage } from '@/lib/http'
import { cn, formatDuration } from '@/lib/utils'
import { QUIZ_TYPE_LABELS, type QuizResultDetail } from '@/schemas/quiz'

/** 题目选项/作答：把 DTO 里的展示串拆回集合（多选按「、」连接，PAD §9.7） */
function splitAnswerLabel(label: string | null): string[] {
  if (label === null || label.trim() === '') return []
  return label.split('、')
}

function ResultDetail({ detail, index }: { detail: QuizResultDetail; index: number }) {
  const userPicks = splitAnswerLabel(detail.user_answer)
  const isChoice = detail.type === 'SINGLE' || detail.type === 'MULTIPLE'
  const rightPicks = splitAnswerLabel(detail.right_answer)

  return (
    <li className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={detail.correct ? 'secondary' : 'destructive'}>
          {detail.correct ? (
            <CircleCheck aria-hidden="true" />
          ) : (
            <TriangleAlert aria-hidden="true" />
          )}
          {detail.correct ? '答对' : '答错'}
        </Badge>
        <span className="text-muted-foreground text-xs tabular-nums">第 {index + 1} 题</span>
        <Badge variant="outline">{QUIZ_TYPE_LABELS[detail.type]}</Badge>
      </div>

      <p className="text-pretty font-medium text-sm leading-relaxed">{detail.stem}</p>

      {isChoice ? (
        <ul className="space-y-1.5">
          {detail.options.map((option) => {
            const isRight = rightPicks.includes(option)
            const isUser = userPicks.includes(option)
            return (
              <li
                key={option}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-sm',
                  isRight
                    ? 'border-primary/40 bg-primary/5'
                    : isUser
                      ? 'border-destructive/40 bg-destructive/5'
                      : 'border-border',
                )}
              >
                <span>{option}</span>
                <span className="flex items-center gap-1.5">
                  {isRight ? <Badge variant="secondary">正确答案</Badge> : null}
                  {isUser ? <Badge variant="outline">你的选择</Badge> : null}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}

      <dl className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border px-2.5 py-1.5">
          <dt className="text-muted-foreground text-xs">你的作答</dt>
          <dd className="text-sm">{detail.user_answer ?? '未作答'}</dd>
        </div>
        <div className="rounded-lg border border-border px-2.5 py-1.5">
          <dt className="text-muted-foreground text-xs">参考答案</dt>
          <dd className="text-sm">{detail.right_answer}</dd>
        </div>
      </dl>

      <div className="rounded-lg bg-muted/40 p-3">
        <p className="text-muted-foreground text-xs">解析</p>
        <p className="mt-1 text-pretty text-sm">{detail.explanation}</p>
      </div>

      {detail.citations.length === 0 ? null : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">资料出处</p>
          {detail.citations.map((citation, citationIndex) => (
            <CitationCard
              key={citation.material_id}
              showDetail={false}
              citation={{ ...citation, index: citationIndex + 1 }}
            />
          ))}
        </div>
      )}
    </li>
  )
}

/** 结果页（PAD §6.2 QuizResultPage）：得分 + 逐题对错 + 解析 + 资料出处 */
export function QuizResultPage() {
  const navigate = useNavigate()
  const { attemptId } = useParams()
  const id = Number(attemptId)
  const resultQuery = useQuizResultQuery(id)
  const result = resultQuery.data

  const backButton = (
    <Button type="button" variant="outline" onClick={() => navigate('/quiz')}>
      再练一次
    </Button>
  )

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <EmptyState
          title="作答记录不存在"
          description="URL 中的作答 ID 无效。"
          action={
            <Button type="button" onClick={() => navigate('/quiz')}>
              返回练习
            </Button>
          }
        />
      </div>
    )
  }

  if (resultQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3" aria-hidden="true">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (resultQuery.isError || result === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">结果加载失败</p>
          <p className="mt-1 text-muted-foreground text-sm">
            {resolveErrorMessage(resultQuery.error)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void resultQuery.refetch()}
          >
            重试
          </Button>
        </div>
      </div>
    )
  }

  const accuracy = result.total === 0 ? 0 : Math.round((result.correct / result.total) * 100)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-semibold text-xl">练习结果</h1>
          <p className="text-muted-foreground text-sm">
            答对 {result.correct} / {result.total} 题 · 正确率 {accuracy}% · 用时{' '}
            {formatDuration(result.duration_ms)}
          </p>
        </div>
        {backButton}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-muted-foreground text-xs">得分</p>
          <p className="font-semibold text-2xl tabular-nums">{result.score}</p>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-muted-foreground text-xs">正确率</p>
          <p className="font-semibold text-2xl tabular-nums">{accuracy}%</p>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-muted-foreground text-xs">答对</p>
          <p className="font-semibold text-2xl tabular-nums">{result.correct}</p>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-muted-foreground text-xs">用时</p>
          <p className="font-semibold text-sm">{formatDuration(result.duration_ms)}</p>
        </div>
      </div>

      {result.weak_points_generated.length === 0 ? (
        <p className="rounded-xl border border-border p-3 text-sm">
          本次没有暴露明显薄弱点，继续保持。
        </p>
      ) : (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="font-medium text-sm">本次暴露的薄弱点</p>
          <div className="flex flex-wrap gap-2">
            {result.weak_points_generated.map((point) => (
              <Badge key={point} variant="destructive">
                {point}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <ul className="space-y-4">
        {result.details.map((detail, index) => (
          <ResultDetail key={detail.question_id} detail={detail} index={index} />
        ))}
      </ul>

      <div className="flex justify-end">{backButton}</div>
    </div>
  )
}
