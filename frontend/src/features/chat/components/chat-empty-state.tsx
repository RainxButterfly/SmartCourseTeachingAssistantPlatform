import { MessageSquareText, Sparkles } from 'lucide-react'

import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useChatSuggestionsQuery } from '@/features/chat/queries'

const SUGGESTION_SKELETONS = [0, 1, 2]

interface ChatEmptyStateProps {
  /** 推荐问题按检索范围下发 */
  courseId: number
  title: string
  description: string
  onPick: (question: string) => void
}

/** 问答空态：推荐问题 chips + 使用提示（PAD §6.2），ChadPanel 与 ChatPage 共用 */
export function ChatEmptyState({ courseId, title, description, onPick }: ChatEmptyStateProps) {
  const suggestions = useChatSuggestionsQuery(courseId)

  return (
    <EmptyState
      className="w-full border-0"
      icon={<MessageSquareText className="size-5" />}
      title={title}
      description={description}
      action={
        <div className="flex max-w-xl flex-wrap justify-center gap-2">
          {suggestions.isPending
            ? SUGGESTION_SKELETONS.map((index) => <Skeleton key={index} className="h-7 w-36" />)
            : (suggestions.data?.items ?? []).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onPick(item)}
                >
                  <Sparkles aria-hidden="true" />
                  {item}
                </Button>
              ))}
        </div>
      }
    />
  )
}
