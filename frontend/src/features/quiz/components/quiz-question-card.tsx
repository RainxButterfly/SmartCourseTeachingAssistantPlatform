import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  isAnswered,
  QUIZ_TYPE_LABELS,
  type QuizAnswerValue,
  type QuizQuestion,
} from '@/schemas/quiz'

interface QuizQuestionCardProps {
  question: QuizQuestion
  value: QuizAnswerValue | undefined
  flagged: boolean
  onChange: (value: QuizAnswerValue) => void
}

/** 题目卡片（PAD §6.2 QuizPage）：按题型渲染作答控件；题号与进度由 QuizRunner 统一展示 */
export function QuizQuestionCard({ question, value, flagged, onChange }: QuizQuestionCardProps) {
  const selected = typeof value === 'string' ? [value] : (value ?? [])
  const answered = isAnswered(value)

  const toggleMultiple = (option: string): void => {
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]
    onChange(next)
  }

  const renderAnswer = () => {
    if (question.type === 'SINGLE') {
      return (
        <RadioGroup
          value={typeof value === 'string' ? value : ''}
          onValueChange={(next) => onChange(String(next))}
        >
          {question.options.map((option, optionIndex) => {
            const optionId = `quiz-q${question.id}-opt${optionIndex}`
            return (
              // 显式 htmlFor 关联控件：点击整行即可选中，键盘与读屏都可正常操作
              <label
                key={option}
                htmlFor={optionId}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors',
                  selected[0] === option ? 'border-primary/50 bg-primary/5' : 'border-border',
                )}
              >
                <RadioGroupItem id={optionId} value={option} className="mt-0.5" />
                <span className="text-sm">{option}</span>
              </label>
            )
          })}
        </RadioGroup>
      )
    }

    if (question.type === 'MULTIPLE') {
      return (
        <div className="grid gap-2">
          {question.options.map((option, optionIndex) => {
            const optionId = `quiz-q${question.id}-opt${optionIndex}`
            return (
              <label
                key={option}
                htmlFor={optionId}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors',
                  selected.includes(option) ? 'border-primary/50 bg-primary/5' : 'border-border',
                )}
              >
                <Checkbox
                  id={optionId}
                  checked={selected.includes(option)}
                  className="mt-0.5"
                  onCheckedChange={() => toggleMultiple(option)}
                />
                <span className="text-sm">{option}</span>
              </label>
            )
          })}
        </div>
      )
    }

    if (question.type === 'ESSAY') {
      return (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          aria-label="作答"
          placeholder="写下你的思路，交卷后可与参考答案对照"
          rows={4}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    }

    return (
      <Input
        value={typeof value === 'string' ? value : ''}
        aria-label="作答"
        placeholder="填写答案"
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{QUIZ_TYPE_LABELS[question.type]}</Badge>
        {flagged ? <Badge variant="outline">已标记不确定</Badge> : null}
        {answered ? null : <span className="text-muted-foreground text-xs">（未作答）</span>}
      </div>

      <p className="text-pretty font-medium text-sm leading-relaxed">{question.stem}</p>

      {renderAnswer()}
    </div>
  )
}
