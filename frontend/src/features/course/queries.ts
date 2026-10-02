import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  createCourse,
  deleteCourse,
  fetchCourseDetail,
  fetchCourseList,
  fetchSemesters,
  isCourseCodeConflict,
  readDeleteConflict,
  updateCourse,
} from '@/features/course/api'
import { resolveErrorMessage } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import type { CourseListQuery, CourseUpsertBody } from '@/schemas/course'

/** 课程列表：翻页时保留上一页数据，避免整块闪白 */
export function courseListQueryOptions(query: CourseListQuery) {
  return queryOptions({
    queryKey: queryKeys.courses.list(query),
    queryFn: () => fetchCourseList(query),
    placeholderData: keepPreviousData,
  })
}

export function useCourseListQuery(query: CourseListQuery) {
  return useQuery(courseListQueryOptions(query))
}

/** 学期字典：变更频率极低，缓存 5 分钟 */
export function useSemestersQuery() {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.courses.semesters(),
      queryFn: () => fetchSemesters(),
      staleTime: 5 * 60_000,
    }),
  )
}

export function useCourseDetailQuery(id: number) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.courses.detail(id),
      queryFn: () => fetchCourseDetail(id),
      enabled: Number.isFinite(id) && id > 0,
    }),
  )
}

interface DeleteCourseVariables {
  id: number
  /** true = 连同其下资料与会话一并删除（对应 1006 后的二次确认） */
  cascade: boolean
}

export function useDeleteCourseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, cascade }: DeleteCourseVariables) => deleteCourse(id, cascade),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() })
      toast.success('课程已删除')
    },
    onError: (error) => {
      // 1006 属预期交互（需弹级联确认），由弹窗自行处理，不打扰用户
      if (readDeleteConflict(error) !== null) return
      toast.error(resolveErrorMessage(error))
    },
  })
}

interface SaveCourseVariables {
  /** 有 id 为编辑，无 id 为新建 */
  id?: number
  body: CourseUpsertBody
}

export function useSaveCourseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: SaveCourseVariables) =>
      id === undefined ? createCourse(body) : updateCourse(id, body),
    onSuccess: async (course, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() })
      await queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(course.id) })
      toast.success(variables.id === undefined ? '课程已创建' : '课程已保存')
    },
    onError: (error) => {
      // 1005（编号重复）由表单映射到 code 字段，避免「既有字段错误又有通用 toast」的双重提示
      if (isCourseCodeConflict(error)) return
      toast.error(resolveErrorMessage(error))
    },
  })
}
