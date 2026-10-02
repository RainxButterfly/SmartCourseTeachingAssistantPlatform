import { BookOpen, Plus, RefreshCw, SearchX } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CourseCard } from '@/features/course/components/course-card'
import { CourseDeleteDialog } from '@/features/course/components/course-delete-dialog'
import { CourseListFilters } from '@/features/course/components/course-list-filters'
import { useCourseListQuery, useSemestersQuery } from '@/features/course/queries'
import { useCourseListParams } from '@/features/course/use-course-list-params'
import { resolveErrorMessage } from '@/lib/http'
import type { Course } from '@/schemas/course'

const SKELETON_KEYS = [
  'skeleton-1',
  'skeleton-2',
  'skeleton-3',
  'skeleton-4',
  'skeleton-5',
  'skeleton-6',
]

function CourseGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {SKELETON_KEYS.map((key) => (
        <div key={key} className="space-y-3 rounded-xl border border-border p-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  )
}

export function CourseListPage() {
  const navigate = useNavigate()
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null)

  const { params, query, keywordInput, setKeywordInput, hasActiveFilters, clearFilters, commit } =
    useCourseListParams()
  const semestersQuery = useSemestersQuery()
  const { data, isPending, isError, error, refetch, isFetching } = useCourseListQuery(query)

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1

  /** 看某一页：第 1 页属默认值，不写入 URL */
  const goToPage = (nextPage: number): void => {
    commit({ page: nextPage <= 1 ? null : String(nextPage) })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-semibold text-xl">课程</h1>
          <p className="text-muted-foreground text-sm">管理课程资料与专属知识库</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            aria-label="刷新课程列表"
            onClick={() => void refetch()}
          >
            <RefreshCw aria-hidden="true" className={isFetching ? 'animate-spin' : undefined} />
          </Button>
          <Button type="button" onClick={() => navigate('/courses/new')}>
            <Plus aria-hidden="true" />
            新建课程
          </Button>
        </div>
      </header>

      <CourseListFilters
        keyword={keywordInput}
        onKeywordChange={setKeywordInput}
        scope={params.scope}
        onScopeChange={(value) => commit({ scope: value === 'mine' ? 'mine' : null, page: null })}
        semester={params.semester}
        onSemesterChange={(value) => commit({ semester: value === '' ? null : value, page: null })}
        sort={params.sort}
        onSortChange={(value) => commit({ sort: value === 'recent' ? null : value, page: null })}
        semesterOptions={semestersQuery.data?.items ?? []}
        semesterLoading={semestersQuery.isPending}
      />

      {isPending ? <CourseGridSkeleton /> : null}

      {isError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">课程加载失败</p>
          <p className="mt-1 text-muted-foreground text-sm">{resolveErrorMessage(error)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void refetch()}
          >
            重试
          </Button>
        </div>
      ) : null}

      {data ? (
        data.list.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon={<SearchX className="size-5" />}
              title="没有匹配的课程"
              description="换个关键词，或清空筛选条件再试一次。"
              action={
                <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                  清空筛选
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<BookOpen className="size-5" />}
              title="还没有课程"
              description="创建第一门课程，然后上传资料构建它的专属知识库。"
              action={
                <Button type="button" size="sm" onClick={() => navigate('/courses/new')}>
                  <Plus aria-hidden="true" />
                  新建课程
                </Button>
              }
            />
          )
        ) : (
          <>
            <ul className="grid list-none gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.list.map((course) => (
                <li key={course.id}>
                  <CourseCard
                    course={course}
                    onOpen={(item) => navigate(`/courses/${item.id}`)}
                    onEdit={(item) => navigate(`/courses/${item.id}/edit`)}
                    onDelete={(item) => setPendingDelete(item)}
                  />
                </li>
              ))}
            </ul>

            <nav
              aria-label="课程分页"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <p className="text-muted-foreground text-sm">
                共 {data.total} 门课程
                {data.total > data.size ? ` · 第 ${data.page} / ${totalPages} 页` : ''}
              </p>
              {data.total > data.size ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={data.page <= 1}
                    onClick={() => goToPage(data.page - 1)}
                  >
                    上一页
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={data.page >= totalPages}
                    onClick={() => goToPage(data.page + 1)}
                  >
                    下一页
                  </Button>
                </div>
              ) : null}
            </nav>
          </>
        )
      ) : null}

      <CourseDeleteDialog
        course={pendingDelete}
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      />
    </div>
  )
}
