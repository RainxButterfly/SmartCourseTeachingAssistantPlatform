import { useState } from 'react'
import { useNavigate } from 'react-router'

import { AttemptHistory } from '@/features/quiz/components/attempt-history'
import { QuizComposer, type QuizSession } from '@/features/quiz/components/quiz-composer'
import { QuizRunner } from '@/features/quiz/components/quiz-runner'

/**
 * 智能出题（PAD §6.1 /quiz、§6.2 QuizPage）：
 * 组卷态（默认）与答题态在同一路由切换；进行中的作答只在前端内存，刷新会丢失。
 */
export function QuizPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<QuizSession | null>(null)

  if (session !== null) {
    return (
      <QuizRunner
        attemptId={session.attemptId}
        questions={session.questions}
        onSubmitted={(result) => navigate(`/quiz/${result.attempt_id}`)}
      />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="font-semibold text-xl">智能出题</h1>
        <p className="text-muted-foreground text-sm">
          按课程与薄弱点生成练习，交卷后自动判分并给出解析与资料出处。
        </p>
      </header>

      <QuizComposer onStarted={setSession} />
      <AttemptHistory />
    </div>
  )
}
