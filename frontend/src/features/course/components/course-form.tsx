import { zodResolver } from '@hookform/resolvers/zod'
import { type FocusEvent, useId, useRef } from 'react'
import { useForm } from 'react-hook-form'

import { describeField, FieldShell } from '@/components/shared/field-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { fetchCourseCodeCheckSafe, isCourseCodeConflict } from '@/features/course/api'
import { useSaveCourseMutation, useSemestersQuery } from '@/features/course/queries'
import {
  COURSE_CODE_PATTERN,
  COURSE_COLOR_PRESETS,
  type Course,
  CourseFormSchema,
  type CourseFormValues,
} from '@/schemas/course'

/** 预设色板的中文名，供屏幕阅读器与测试定位 */
const COLOR_LABELS: Record<string, string> = {
  '#7c9cff': '靛蓝',
  '#5ec8a8': '薄荷',
  '#f2b45c': '琥珀',
  '#e5739b': '玫红',
  '#a78bfa': '紫罗兰',
  '#4fb3d9': '天蓝',
}

const VISIBILITY_OPTIONS: Array<{
  value: CourseFormValues['visibility']
  label: string
  hint: string
}> = [
  { value: 'PRIVATE', label: '私有', hint: '仅自己可见' },
  { value: 'PUBLIC', label: '公开', hint: '列表中对所有人可见' },
]

interface CourseFormProps {
  /** 有值 = 编辑态 */
  courseId?: number
  defaultValues: CourseFormValues
  onSaved: (course: Course) => void
  onCancel: () => void
}

export function CourseForm({ courseId, defaultValues, onSaved, onCancel }: CourseFormProps) {
  const fieldId = useId()
  const mutation = useSaveCourseMutation()
  const semestersQuery = useSemestersQuery()
  const isEdit = courseId !== undefined

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(CourseFormSchema),
    defaultValues,
    mode: 'onBlur',
  })

  const submitting = isSubmitting || mutation.isPending

  const submit = handleSubmit(async (values) => {
    try {
      const course = await mutation.mutateAsync({ id: courseId, body: values })
      onSaved(course)
    } catch (error) {
      // 唯一性由服务端裁决（1005）；映射到 code 字段而非弹通用 toast
      if (isCourseCodeConflict(error)) {
        setError('code', { type: 'server', message: '该课程编号已被占用，请换一个' })
      }
    }
  })

  const baselineCode = defaultValues.code
  const codeField = register('code')
  const lastCheckedCodeRef = useRef('')

  /**
   * 失焦即做唯一性预检（PAD §6.2「唯一校验异步」）。
   * 注意：RHF 一旦挂了 resolver，register 的 validate 规则不再生效，
   * 因此这里显式在 onBlur 里做异步校验，并用 ref 丢弃过期响应。
   */
  const handleCodeBlur = async (event: FocusEvent<HTMLInputElement>): Promise<void> => {
    const trimmed = event.target.value.trim()
    // 空值或格式非法交给 CourseFormSchema 报错，不打接口
    if (trimmed === '' || !COURSE_CODE_PATTERN.test(trimmed)) return
    // 编辑态未改动编号，无需预检
    if (courseId !== undefined && trimmed === baselineCode) return

    lastCheckedCodeRef.current = trimmed
    const result = await fetchCourseCodeCheckSafe(trimmed, courseId)
    if (lastCheckedCodeRef.current !== trimmed) return

    if (result === null || result.available) {
      clearErrors('code')
      return
    }
    setError('code', {
      type: 'server',
      message: result.conflict_course_name
        ? `该课程编号已被《${result.conflict_course_name}》占用`
        : '该课程编号已被占用，请换一个',
    })
  }

  /** 有错误时指向错误节点，否则指向提示节点（两个 id 由 FieldShell 派生） */
  const describe = (name: keyof CourseFormValues): string =>
    describeField(`${fieldId}-${name}`, errors[name] !== undefined)

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submit(event)
      }}
      className="space-y-6"
      aria-busy={submitting}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <FieldShell
          id={`${fieldId}-name`}
          label="课程名称"
          error={errors.name?.message}
          hint="2-50 字"
        >
          <Input
            id={`${fieldId}-name`}
            placeholder="操作系统"
            aria-invalid={errors.name !== undefined}
            aria-describedby={describe('name')}
            {...register('name')}
          />
        </FieldShell>

        <FieldShell
          id={`${fieldId}-code`}
          label="课程编号"
          error={errors.code?.message}
          hint="2-32 位字母、数字、下划线或中划线，需全局唯一"
        >
          <Input
            id={`${fieldId}-code`}
            placeholder="OS2026"
            aria-invalid={errors.code !== undefined}
            aria-describedby={describe('code')}
            {...codeField}
            onBlur={(event) => {
              void codeField.onBlur(event)
              void handleCodeBlur(event)
            }}
            onChange={(event) => {
              void codeField.onChange(event)
              // 改动后立刻清掉上一次的服务端结论，避免残留过期提示
              if (errors.code?.type === 'server') clearErrors('code')
            }}
          />
        </FieldShell>

        <FieldShell
          id={`${fieldId}-semester`}
          label="学期"
          error={errors.semester?.message}
          hint="可从已有学期中选择，也可直接输入新学期"
        >
          <Input
            id={`${fieldId}-semester`}
            list={`${fieldId}-semester-options`}
            placeholder="2026秋"
            aria-invalid={errors.semester !== undefined}
            aria-describedby={describe('semester')}
            {...register('semester')}
          />
          <datalist id={`${fieldId}-semester-options`}>
            {(semestersQuery.data?.items ?? []).map((item) => (
              <option key={item.value} value={item.value} />
            ))}
          </datalist>
        </FieldShell>

        <FieldShell
          id={`${fieldId}-teacher`}
          label="任课教师"
          error={errors.teacher?.message}
          hint="选填，不超过 50 字"
        >
          <Input
            id={`${fieldId}-teacher`}
            placeholder="李老师"
            aria-invalid={errors.teacher !== undefined}
            aria-describedby={describe('teacher')}
            {...register('teacher')}
          />
        </FieldShell>
      </div>

      <fieldset className="space-y-2">
        <legend className="font-medium text-sm">封面主题色</legend>
        <div className="flex flex-wrap items-center gap-3">
          {COURSE_COLOR_PRESETS.map((preset) => {
            const label = COLOR_LABELS[preset] ?? preset
            return (
              <label
                key={preset}
                className="cursor-pointer rounded-full"
                title={`${label} ${preset}`}
              >
                <input
                  type="radio"
                  value={preset}
                  className="peer sr-only"
                  {...register('color')}
                />
                <span
                  aria-hidden="true"
                  className="block size-7 rounded-full ring-1 ring-foreground/20 transition-shadow peer-checked:ring-2 peer-checked:ring-ring peer-checked:ring-offset-2 peer-checked:ring-offset-background peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                  style={{ backgroundColor: preset }}
                />
                <span className="sr-only">{label}</span>
              </label>
            )
          })}
        </div>
        {errors.color ? (
          <p role="alert" className="text-destructive text-xs">
            {errors.color.message}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-medium text-sm">可见性</legend>
        <div className="flex flex-wrap items-center gap-4">
          {VISIBILITY_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value={option.value}
                className="size-4 accent-primary"
                {...register('visibility')}
              />
              <span>
                {option.label}
                <span className="ml-1 text-muted-foreground text-xs">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <FieldShell
        id={`${fieldId}-description`}
        label="课程简介"
        error={errors.description?.message}
        hint="选填，不超过 200 字"
      >
        <Textarea
          id={`${fieldId}-description`}
          rows={4}
          placeholder="课程的核心内容与重点章节…"
          aria-invalid={errors.description !== undefined}
          aria-describedby={describe('description')}
          {...register('description')}
        />
      </FieldShell>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" disabled={submitting} onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? '保存中…' : isEdit ? '保存修改' : '创建课程'}
        </Button>
      </div>
    </form>
  )
}
