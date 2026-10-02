import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { useCourseListQuery } from '@/features/course/queries'

/** 全部资料（course_id = 0） */
export const ALL_MATERIALS_SCOPE = 0

const COURSE_OPTIONS_QUERY = { page: 1, size: 50, sort: 'recent' } as const

interface CourseScopeSelectProps {
  value: number
  onChange: (courseId: number) => void
  disabled?: boolean
}

/** 检索范围选择（PAD §6.2 ChatPage 输入框区）：默认全部资料，可收敛到某一门课 */
export function CourseScopeSelect({ value, onChange, disabled = false }: CourseScopeSelectProps) {
  const coursesQuery = useCourseListQuery({ ...COURSE_OPTIONS_QUERY })
  const courses = coursesQuery.data?.list ?? []

  const selected = courses.find((course) => course.id === value)
  const label = value === ALL_MATERIALS_SCOPE ? '全部资料' : (selected?.name ?? '加载中…')

  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger className="w-44" aria-label="检索范围" disabled={disabled}>
        <span data-slot="select-value" className="min-w-0 truncate text-left">
          {label}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={String(ALL_MATERIALS_SCOPE)}>全部资料</SelectItem>
        {courses.map((course) => (
          <SelectItem key={course.id} value={String(course.id)}>
            {course.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
