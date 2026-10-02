import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { readDeleteConflict } from '@/features/course/api'
import { useDeleteCourseMutation } from '@/features/course/queries'
import type { Course, CourseDeleteConflict } from '@/schemas/course'

interface CourseDeleteDialogProps {
  course: Course | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 删除课程二次确认。
 * 两段式：先按 cascade=false 删除；后端返回 1006 时切换到级联确认态，
 * 用错误载荷里的资料 / 会话数量明确告知影响面，用户再确认才带 cascade=true。
 */
export function CourseDeleteDialog({ course, open, onOpenChange }: CourseDeleteDialogProps) {
  const mutation = useDeleteCourseMutation()
  const [conflict, setConflict] = useState<CourseDeleteConflict | null>(null)

  // 关闭弹窗（或切换目标课程）时重置级联确认态
  useEffect(() => {
    if (!open) setConflict(null)
  }, [open])

  const handleConfirm = async (cascade: boolean): Promise<void> => {
    if (!course) return

    try {
      await mutation.mutateAsync({ id: course.id, cascade })
      onOpenChange(false)
    } catch (error) {
      const payload = readDeleteConflict(error)
      if (payload !== null) {
        setConflict(payload)
        return
      }
      // 其他错误已由 mutation 的 onError 统一 toast
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <TriangleAlert aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>{conflict ? '确认级联删除' : '删除课程'}</AlertDialogTitle>
          <AlertDialogDescription>
            {conflict
              ? `「${course?.name ?? ''}」下仍有 ${conflict.material_count} 份资料、${conflict.conversation_count} 个会话。继续删除会一并移除这些资料及其知识库向量与全部对话记录，操作不可恢复。`
              : `确定删除「${course?.name ?? ''}」吗？该操作不可恢复。`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => void handleConfirm(conflict !== null)}
          >
            {mutation.isPending ? '删除中…' : conflict ? '确认并一并删除' : '确认删除'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
