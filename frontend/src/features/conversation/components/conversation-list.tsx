import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useConversationListQuery,
  useDeleteConversationMutation,
  useRenameConversationMutation,
} from '@/features/conversation/queries'
import {
  CONVERSATION_PAGE_SIZE,
  useConversationListParams,
} from '@/features/conversation/use-conversation-list-params'
import { resolveErrorMessage } from '@/lib/http'
import { cn, formatRelativeTime } from '@/lib/utils'
import { type Conversation, RenameConversationBodySchema } from '@/schemas/conversation'
import { useChatStore } from '@/stores/chat-store'

const LOADING_KEYS = [0, 1, 2, 3]

interface ConversationListProps {
  /** 当前打开的会话（来自 URL 的 :conversationId） */
  activeId: string | null
}

/**
 * 会话列表（PAD §6.2 ChatPage 左栏）：新建 / 重命名 / 删除 / 搜索。
 * 筛选与分页状态同步 URL，与课程列表同一套约定。
 */
export function ConversationList({ activeId }: ConversationListProps) {
  const navigate = useNavigate()
  const { params, query, keywordInput, setKeywordInput, commit } = useConversationListParams()
  const listQuery = useConversationListQuery(query)

  const startNewChat = useChatStore((state) => state.startNewChat)
  const renameMutation = useRenameConversationMutation()
  const deleteMutation = useDeleteConversationMutation()

  const [renaming, setRenaming] = useState<Conversation | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [titleError, setTitleError] = useState<string | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null)

  const list = listQuery.data?.list ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / CONVERSATION_PAGE_SIZE))

  // 不预先建空会话：回到 /chat 空态（可先选检索范围），由首次提问隐式创建会话
  const handleCreate = (): void => {
    startNewChat()
    navigate('/chat')
  }

  const openRename = (conversation: Conversation): void => {
    setRenaming(conversation)
    setDraftTitle(conversation.title)
    setTitleError(undefined)
  }

  const submitRename = async (): Promise<void> => {
    if (renaming === null) return

    const parsed = RenameConversationBodySchema.safeParse({ title: draftTitle })
    if (!parsed.success) {
      setTitleError(parsed.error.issues[0]?.message ?? '标题不合法')
      return
    }

    await renameMutation
      .mutateAsync({ id: renaming.id, title: parsed.data.title })
      .catch(() => null)
    setRenaming(null)
  }

  const submitDelete = async (): Promise<void> => {
    if (pendingDelete === null) return

    const target = pendingDelete
    await deleteMutation.mutateAsync(target.id).catch(() => null)
    setPendingDelete(null)
    // 删掉的正是当前打开的会话 → 回到「新对话」
    if (target.id === activeId) navigate('/chat')
  }

  return (
    <aside aria-label="会话列表" className="flex w-72 shrink-0 flex-col border-r border-border">
      <div className="flex items-center justify-between gap-2 p-3">
        <h2 className="font-medium text-sm">对话</h2>
        <Button type="button" size="sm" onClick={handleCreate}>
          <Plus aria-hidden="true" />
          新建
        </Button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={keywordInput}
            aria-label="搜索会话"
            placeholder="搜索会话标题"
            className="pl-8"
            onChange={(event) => setKeywordInput(event.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 px-2 pb-2">
          {listQuery.isPending ? (
            <div className="space-y-1" aria-hidden="true">
              {LOADING_KEYS.map((key) => (
                <Skeleton key={key} className="h-12 w-full" />
              ))}
            </div>
          ) : null}

          {listQuery.isError ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"
            >
              <p className="font-medium text-destructive text-xs">会话加载失败</p>
              <p className="mt-1 text-muted-foreground text-xs">
                {resolveErrorMessage(listQuery.error)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="mt-2"
                onClick={() => void listQuery.refetch()}
              >
                重试
              </Button>
            </div>
          ) : null}

          {listQuery.isSuccess && list.length === 0 ? (
            <p className="px-2 py-8 text-center text-muted-foreground text-xs">
              {params.keyword === ''
                ? '还没有会话，点右上角「新建」开始提问'
                : '没有匹配的会话，换个关键词试试'}
            </p>
          ) : null}

          {list.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                'flex items-center gap-0.5 rounded-lg pr-1 transition-colors',
                conversation.id === activeId ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/60',
              )}
            >
              <Link
                to={`/chat/${conversation.id}`}
                className="min-w-0 flex-1 rounded-lg px-2.5 py-2"
              >
                <span className="block truncate text-sm">{conversation.title}</span>
                <span className="block truncate text-muted-foreground text-xs">
                  {conversation.course_name} · {conversation.message_count} 条 ·{' '}
                  {formatRelativeTime(conversation.last_message_at)}
                </span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`重命名 ${conversation.title}`}
                onClick={() => openRename(conversation)}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={`删除 ${conversation.title}`}
                onClick={() => setPendingDelete(conversation)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {total > CONVERSATION_PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-2 border-t border-border p-2">
          <span className="text-muted-foreground text-xs tabular-nums">
            共 {total} 个 · 第 {params.page} / {totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={params.page <= 1}
              onClick={() => commit({ page: String(params.page - 1) })}
            >
              上一页
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={params.page >= totalPages}
              onClick={() => commit({ page: String(params.page + 1) })}
            >
              下一页
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => {
          if (!open) setRenaming(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名会话</DialogTitle>
            <DialogDescription>标题用于在列表中快速定位这段对话，最多 100 字。</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Input
              value={draftTitle}
              aria-label="会话标题"
              onChange={(event) => setDraftTitle(event.target.value)}
            />
            {titleError === undefined ? null : (
              <p role="alert" className="text-destructive text-xs">
                {titleError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenaming(null)}>
              取消
            </Button>
            <Button
              type="button"
              disabled={renameMutation.isPending}
              onClick={() => void submitRename()}
            >
              {renameMutation.isPending ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除会话</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{pendingDelete?.title ?? ''}
              」吗？该会话的消息记录将一并移除，操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void submitDelete()}
            >
              {deleteMutation.isPending ? '删除中…' : '确认删除'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
