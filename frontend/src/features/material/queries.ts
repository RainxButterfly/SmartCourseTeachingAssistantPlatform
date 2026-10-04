import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  deleteMaterial,
  fetchDownloadUrl,
  fetchMaterial,
  fetchMaterialList,
  fetchParseStatus,
  renameMaterial,
  reparseMaterial,
} from '@/features/material/api'
import { resolveErrorMessage } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import type { MaterialListQuery } from '@/schemas/material'

export function useMaterialListQuery(courseId: number, query: MaterialListQuery) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.materials.list(courseId, query),
      queryFn: () => fetchMaterialList(courseId, query),
      enabled: Number.isFinite(courseId) && courseId > 0,
    }),
  )
}

/**
 * 资料详情。
 * 用途：`/materials/:id/parse` 深链兜底页据此反查所属课程，再重定向到该课程的资料 Tab。
 */
export function useMaterialQuery(materialId: number) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.materials.detail(materialId),
      queryFn: () => fetchMaterial(materialId),
      enabled: Number.isInteger(materialId) && materialId > 0,
    }),
  )
}

/**
 * 解析进度轮询。
 * 只在中间态启用，并在终态（SUCCESS/FAILED）自动停表，避免无意义的持续请求。
 */
export function useParseStatusQuery(materialId: number, enabled: boolean) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.materials.parseStatus(materialId),
      queryFn: () => fetchParseStatus(materialId),
      enabled: enabled && materialId > 0,
      refetchInterval: (query) => {
        const status = query.state.data?.status
        if (status === 'SUCCESS' || status === 'FAILED') return false
        return 1500
      },
    }),
  )
}

function useInvalidateMaterials(): () => Promise<void> {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.materials.all() })
  }
}

export function useRenameMaterialMutation() {
  const invalidate = useInvalidateMaterials()

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameMaterial(id, name),
    onSuccess: async () => {
      await invalidate()
      toast.success('资料已重命名')
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error))
    },
  })
}

export function useDeleteMaterialMutation() {
  const invalidate = useInvalidateMaterials()

  return useMutation({
    mutationFn: (id: number) => deleteMaterial(id),
    onSuccess: async () => {
      await invalidate()
      toast.success('资料已删除')
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error))
    },
  })
}

export function useReparseMaterialMutation() {
  const invalidate = useInvalidateMaterials()

  return useMutation({
    mutationFn: (id: number) => reparseMaterial(id),
    onSuccess: async () => {
      await invalidate()
      toast.success('已重新提交解析')
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error))
    },
  })
}

export function useDownloadMaterialMutation() {
  return useMutation({
    mutationFn: (id: number) => fetchDownloadUrl(id),
    onSuccess: (result) => {
      // 后端返回的是 MinIO 预签名 GET URL，直接交给浏览器下载
      window.open(result.url, '_blank', 'noopener,noreferrer')
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error))
    },
  })
}
