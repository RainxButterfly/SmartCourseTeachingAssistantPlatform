import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { QuizQuestionCard } from '@/features/quiz/components/quiz-question-card'
import { useSubmitQuizMutation } from '@/features/quiz/queries'
import { cn, formatClock } from '@/lib/utils'
import {
  isAnswered,
  type QuizAnswerValue,
  type QuizQuestion,
  type QuizResult,
} from '@/schemas/quiz'

interface QuizRunnerProps {
  attemptId: number
  questions: QuizQuestion[]
  onSubmitted: (result: QuizResult) => void
}

/** 答题态（PAD §6.2 QuizPage）：进度条 + 题号 + 计时器 + 交卷 + 上一题/下一题/标记不确定 */
export function QuizRunner({ attemptId, questions, onSubmitted }: QuizRunnerProps) {
  const submitMutation = useSubmitQuizMutation()

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, QuizAnswerValue>>({})
  const [flagged, setFlagged] = useState<number[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const startedAtRef = useRef(Date.now())

  // 计时器每秒刷新；用时会在交卷时随请求一起上报（PAD §9.7 duration_ms）
  useEffect(() => {
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const question = questions[index]

  const answeredCount = useMemo(
    () => questions.filter((item) => isAnswered(answers[String(item.id)])).length,
    [answers, questions],
  )
  const unansweredCount = questions.length - answeredCount

  if (question === undefined) return null

  const currentFlagged = flagged.includes(question.id)

  const setAnswer = (value: QuizAnswerValue): void => {
    setAnswers((prev) => ({ ...prev, [String(question.id)]: value }))
  }

  const toggleFlag = (): void => {
    setFlagged((prev) =>
      currentFlagged ? prev.filter((id) => id !== question.id) : [...prev, question.id],
    )
  }

  const submit = (): void => {
    submitMutation.mutate(
      { attempt_id: attemptId, answers, duration_ms: elapsedMs },
      { onSuccess: onSubmitted },
    )
  }

  const handleSubmitClick = (): void => {
    if (unansweredCount > 0) setConfirmOpen(true)
    else submit()
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="space-y-3 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-sm tabular-nums">
            第 {index + 1} / {questions.length} 题
          </p>
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
            <span className="tabular-nums">已答 {answeredCount} 题</span>
            <span className="tabular-nums">用时 {formatClock(elapsedMs)}</span>
            <Button
              type="button"
              size="sm"
              disabled={submitMutation.isPending}
              onClick={handleSubmitClick}
            >
              {submitMutation.isPending
                ? '提交中…'
                : unansweredCount > 0
                  ? `交卷（还有 ${unansweredCount} 题未作答）`
                  : '交卷'}
            </Button>
          </div>
        </div>

        <Progress
          value={questions.length === 0 ? 0 : Math.round((answeredCount / questions.length) * 100)}
          aria-label="答题进度"
        />

        <div className="flex flex-wrap gap-1.5">
          {questions.map((item, itemIndex) => {
            const itemFlagged = flagged.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                aria-label={`跳转第 ${itemIndex + 1} 题${itemFlagged ? '（已标记不确定）' : ''}`}
                aria-current={itemIndex === index ? 'true' : undefined}
                onClick={() => setIndex(itemIndex)}
                className={cn(
                  'size-6 rounded-md text-[11px] tabular-nums transition-colors',
                  isAnswered(answers[String(item.id)])
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                  itemFlagged && 'ring-2 ring-destructive/60',
                  itemIndex === index && 'outline-2 outline-offset-2 outline-ring',
                )}
              >
                {itemIndex + 1}
              </button>
            )
          })}
        </div>
      </div>

      <QuizQuestionCard
        question={question}
        value={answers[String(question.id)]}
        flagged={currentFlagged}
        onChange={setAnswer}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex((prev) => prev - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          上一题
        </Button>

        <Button type="button" variant="ghost" aria-pressed={currentFlagged} onClick={toggleFlag}>
          {currentFlagged ? '取消标记' : '标记不确定'}
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={index === questions.length - 1}
          onClick={() => setIndex((prev) => prev + 1)}
        >
          下一题
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认交卷</AlertDialogTitle>
            <AlertDialogDescription>
              还有 {unansweredCount} 题未作答，未作答的题将计为错误。确认现在交卷吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              继续作答
            </Button>
            <Button type="button" disabled={submitMutation.isPending} onClick={submit}>
              {submitMutation.isPending ? '提交中…' : '确认交卷'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
