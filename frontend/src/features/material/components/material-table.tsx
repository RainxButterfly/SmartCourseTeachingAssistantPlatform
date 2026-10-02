import { Download, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MaterialStatusCell } from '@/features/material/components/material-status-cell'
import {
  useDeleteMaterialMutation,
  useDownloadMaterialMutation,
  useRenameMaterialMutation,
  useReparseMaterialMutation,
} from '@/features/material/queries'
import { formatBytes, formatDateTime } from '@/lib/utils'
import { MATERIAL_IN_PROGRESS_STATUSES, type Material } from '@/schemas/material'

interface MaterialTableProps {
  materials: Material[]
}

export function MaterialTable({ materials }: MaterialTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draftName, setDraftName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Material | null>(null)

  const renameMutation = useRenameMaterialMutation()
  const deleteMutation = useDeleteMaterialMutation()
  const reparseMutation = useReparseMaterialMutation()
  const downloadMutation = useDownloadMaterialMutation()

  const startEdit = (material: Material): void => {
    setEditingId(material.id)
    setDraftName(material.name)
  }

  const saveRename = async (material: Material): Promise<void> => {
    const name = draftName.trim()
    if (name === '' || name === material.name) {
      setEditingId(null)
      return
    }
    await renameMutation.mutateAsync({ id: material.id, name })
    setEditingId(null)
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>大小</TableHead>
            <TableHead>页数</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>上传时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((material) => {
            const inProgress = MATERIAL_IN_PROGRESS_STATUSES.includes(material.status)
            return (
              <TableRow key={material.id} data-testid={`material-row-${material.id}`}>
                <TableCell className="max-w-72">
                  {editingId === material.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={draftName}
                        aria-label="资料名称"
                        className="h-7"
                        onChange={(event) => setDraftName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void saveRename(material)
                          if (event.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <Button
                        size="sm"
                        disabled={renameMutation.isPending}
                        onClick={() => void saveRename(material)}
                      >
                        保存
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        取消
                      </Button>
                    </div>
                  ) : (
                    <span className="block truncate font-medium" title={material.name}>
                      {material.name}
                    </span>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {material.format} · v{material.version}
                  </p>
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {formatBytes(material.size_bytes)}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {material.page_count > 0 ? material.page_count : '—'}
                </TableCell>
                <TableCell>
                  <MaterialStatusCell material={material} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(material.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`重命名 ${material.name}`}
                      onClick={() => startEdit(material)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`下载 ${material.name}`}
                      disabled={downloadMutation.isPending || material.status === 'UPLOADING'}
                      onClick={() => downloadMutation.mutate(material.id)}
                    >
                      <Download aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`重新解析 ${material.name}`}
                      disabled={reparseMutation.isPending || inProgress}
                      onClick={() => reparseMutation.mutate(material.id)}
                    >
                      <RefreshCw aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`删除 ${material.name}`}
                      onClick={() => setPendingDelete(material)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除资料</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{pendingDelete?.name ?? ''}
              」吗？其解析记录与知识库向量将一并移除，操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setPendingDelete(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (pendingDelete === null) return
                await deleteMutation.mutateAsync(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              {deleteMutation.isPending ? '删除中…' : '确认删除'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
