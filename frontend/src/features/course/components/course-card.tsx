import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Course } from '@/schemas/course'

interface CourseCardProps {
  course: Course
  onOpen: (course: Course) => void
  onEdit: (course: Course) => void
  onDelete: (course: Course) => void
}

export function CourseCard({ course, onOpen, onEdit, onDelete }: CourseCardProps) {
  return (
    <Card
      size="sm"
      className="gap-3 transition-shadow hover:shadow-md focus-within:shadow-md"
      data-testid={`course-card-${course.id}`}
    >
      {/* 封面色块，与 CourseVO.color 一致 */}
      <div aria-hidden="true" className="h-1.5 w-full" style={{ backgroundColor: course.color }} />

      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {course.code}
          </Badge>
          {course.visibility === 'PUBLIC' ? <Badge variant="ghost">公开</Badge> : null}
        </div>
        <CardTitle className="text-pretty">{course.name}</CardTitle>
        <CardDescription>
          {course.teacher === '' ? '未指定教师' : course.teacher}
          {' · '}
          {course.semester === '' ? '未指定学期' : course.semester}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
        <span>资料 {course.material_count} 份</span>
        <span>会话 {course.conversation_count} 个</span>
        <span>最近活跃 {formatRelativeTime(course.last_active_at)}</span>
      </CardContent>

      {/* hover / 键盘聚焦时凸显操作区，触摸端保持可见（降透明度而非隐藏，保证可访问性） */}
      <CardFooter
        className={cn(
          'justify-end gap-1 bg-transparent opacity-70 transition-opacity',
          'group-hover/card:opacity-100 group-focus-within/card:opacity-100',
        )}
      >
        <Button variant="ghost" size="sm" onClick={() => onOpen(course)}>
          进入
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(course)}>
          编辑
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(course)}
        >
          删除
        </Button>
      </CardFooter>
    </Card>
  )
}
