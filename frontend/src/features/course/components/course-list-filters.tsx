import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { CourseSort, SemesterOption } from '@/schemas/course'

export type CourseScope = 'all' | 'mine'

interface CourseListFiltersProps {
  keyword: string
  onKeywordChange: (value: string) => void
  scope: CourseScope
  onScopeChange: (value: CourseScope) => void
  semester: string
  onSemesterChange: (value: string) => void
  sort: CourseSort
  onSortChange: (value: CourseSort) => void
  /** 学期字典（GET /courses/semesters），加载中传空数组 */
  semesterOptions: SemesterOption[]
  semesterLoading?: boolean
}

const SCOPE_OPTIONS: Array<{ value: CourseScope; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'mine', label: '我的' },
]

const SORT_OPTIONS: Array<{ value: CourseSort; label: string }> = [
  { value: 'recent', label: '最近' },
  { value: 'name', label: '名称' },
  { value: 'created', label: '创建时间' },
]

interface ToggleGroupProps<T extends string> {
  label: string
  options: Array<{ value: T; label: string; disabled?: boolean; title?: string }>
  value: T
  onChange: (value: T) => void
}

function ToggleGroup<T extends string>({ label, options, value, onChange }: ToggleGroupProps<T>) {
  return (
    <fieldset className="flex min-w-0 items-center gap-0.5 rounded-lg border border-border p-0.5">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={isActive ? 'secondary' : 'ghost'}
            aria-pressed={isActive}
            disabled={option.disabled ?? false}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(!isActive && 'text-muted-foreground')}
          >
            {option.label}
          </Button>
        )
      })}
    </fieldset>
  )
}

export function CourseListFilters({
  keyword,
  onKeywordChange,
  scope,
  onScopeChange,
  semester,
  onSemesterChange,
  sort,
  onSortChange,
  semesterOptions,
  semesterLoading = false,
}: CourseListFiltersProps) {
  const semesterToggleOptions: Array<{
    value: string
    label: string
    disabled?: boolean
    title?: string
  }> = [
    { value: '', label: '全部' },
    ...semesterOptions.map((item) => ({
      value: item.value,
      label: item.value,
      disabled: item.course_count === 0,
      title: `该学期共 ${item.course_count} 门课程`,
    })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* < sm 独占一行（flex-wrap 下 basis=100%），避免被其它筛选组压到只剩图标；sm 以上恢复自适应宽度 */}
      <div className="relative w-full sm:w-auto sm:min-w-56 sm:flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="搜索课程名称、编号或教师"
          aria-label="搜索课程"
          className="pl-8"
        />
      </div>

      <ToggleGroup
        label="课程范围"
        options={SCOPE_OPTIONS}
        value={scope}
        onChange={onScopeChange}
      />

      {semesterLoading ? (
        <p className="text-muted-foreground text-xs">学期加载中…</p>
      ) : semesterToggleOptions.length > 1 ? (
        <ToggleGroup
          label="学期筛选"
          options={semesterToggleOptions}
          value={semester}
          onChange={onSemesterChange}
        />
      ) : null}

      <ToggleGroup label="排序方式" options={SORT_OPTIONS} value={sort} onChange={onSortChange} />
    </div>
  )
}
