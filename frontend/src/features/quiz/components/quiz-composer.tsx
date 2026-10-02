import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourseListQuery } from '@/features/course/queries'
import { useGenerateQuizMutation, useWeakPointsQuery } from '@/features/quiz/queries'
import { cn } from '@/lib/utils'
import {
  QUIZ_COUNT_OPTIONS,
  QUIZ_DIFFICULTIES,
  QUIZ_DIFFICULTY_LABELS,
  QUIZ_TYPE_LABELS,
  QUIZ_TYPES,
  type QuizDifficulty,
  type QuizQuestion,
  type QuizType,
} from '@/schemas/quiz'

const COURSE_OPTIONS_QUERY = { page: 1, size: 50, sort: 'recent' } as const

export interface QuizSession {
  attemptId: number
  questions: QuizQuestion[]
}

interface QuizComposerProps {
  onStarted: (session: QuizSession) => void
}

/** 组卷态（PAD §6.2 QuizPage）：范围 / 题量 / 题型 / 难度 / 薄弱点 → 开始练习 */
export function QuizComposer({ onStarted }: QuizComposerProps) {
  const [courseId, setCourseId] = useState(0)
  const [count, setCount] = useState<number>(10)
  const [types, setTypes] = useState<QuizType[]>(['SINGLE', 'MULTIPLE'])
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('MEDIUM')
  const [weakPoints, setWeakPoints] = useState<string[]>([])

  const coursesQuery = useCourseListQuery({ ...COURSE_OPTIONS_QUERY })
  const weakPointsQuery = useWeakPointsQuery(courseId)
  const generateMutation = useGenerateQuizMutation()

  const courses = coursesQuery.data?.list ?? []
  const weakPointItems = weakPointsQuery.data?.items ?? []
  const courseLabel =
    courseId === 0 ? '全部资料' : (courses.find((item) => item.id === courseId)?.name ?? '加载中…')

  const toggleType = (type: QuizType): void => {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
    )
  }

  const toggleWeakPoint = (point: string): void => {
    setWeakPoints((prev) =>
      prev.includes(point) ? prev.filter((item) => item !== point) : [...prev, point],
    )
  }

  const handleStart = (): void => {
    generateMutation.mutate(
      {
        course_id: courseId,
        count,
        types,
        difficulty,
        ...(weakPoints.length === 0 ? {} : { weak_points: weakPoints }),
      },
      {
        onSuccess: (data) => onStarted({ attemptId: data.attempt_id, questions: data.questions }),
      },
    )
  }

  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <header className="space-y-1">
        <h2 className="font-medium">开始一次练习</h2>
        <p className="text-muted-foreground text-sm">
          选择题型与范围，系统会基于课程资料和你勾选的薄弱点出题；交卷后自动判分并给出解析。
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="quiz-course">课程</Label>
          <Select
            value={String(courseId)}
            onValueChange={(value) => {
              setCourseId(Number(value))
              // 换范围后原有薄弱点可能不属于该范围，直接清空
              setWeakPoints([])
            }}
          >
            <SelectTrigger id="quiz-course" aria-label="课程" className="w-full">
              <span data-slot="select-value" className="min-w-0 truncate text-left">
                {courseLabel}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">全部资料</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={String(course.id)}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quiz-count">题量</Label>
          <Select value={String(count)} onValueChange={(value) => setCount(Number(value))}>
            <SelectTrigger id="quiz-count" aria-label="题量" className="w-full">
              <span data-slot="select-value">{count} 题</span>
            </SelectTrigger>
            <SelectContent>
              {QUIZ_COUNT_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} 题
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quiz-difficulty">难度</Label>
          <Select
            value={difficulty}
            onValueChange={(value) => setDifficulty(value as QuizDifficulty)}
          >
            <SelectTrigger id="quiz-difficulty" aria-label="难度" className="w-full">
              <span data-slot="select-value">{QUIZ_DIFFICULTY_LABELS[difficulty]}</span>
            </SelectTrigger>
            <SelectContent>
              {QUIZ_DIFFICULTIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {QUIZ_DIFFICULTY_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <p className="font-medium text-sm">题型</p>
          <div className="flex flex-wrap gap-2">
            {QUIZ_TYPES.map((type) => {
              const active = types.includes(type)
              return (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  aria-pressed={active}
                  onClick={() => toggleType(type)}
                >
                  {QUIZ_TYPE_LABELS[type]}
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="font-medium text-sm">薄弱知识点（可选，勾选后优先出题）</p>
        {weakPointsQuery.isPending ? (
          <div className="flex gap-2" aria-hidden="true">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-7 w-28" />
          </div>
        ) : weakPointItems.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            该范围暂无薄弱点数据，留空即由系统自行决定。
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weakPointItems.map((item) => {
              const active = weakPoints.includes(item.point_name)
              return (
                <Button
                  key={item.point_name}
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-pressed={active}
                  className={cn(active && 'border-primary/50 bg-primary/10 text-primary')}
                  onClick={() => toggleWeakPoint(item.point_name)}
                >
                  {item.point_name}
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {Math.round(item.score * 100)}%
                  </span>
                </Button>
              )
            })}
          </div>
        )}
      </div>

      {types.length === 0 ? (
        <p role="alert" className="text-destructive text-xs">
          请至少选择一种题型
        </p>
      ) : null}

      <Button
        type="button"
        disabled={generateMutation.isPending || types.length === 0}
        onClick={handleStart}
      >
        <Sparkles aria-hidden="true" />
        {generateMutation.isPending ? '正在出题…' : '开始练习'}
      </Button>
    </section>
  )
}
