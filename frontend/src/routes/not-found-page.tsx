import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <p className="font-semibold text-5xl tracking-tight">404</p>
      <div className="space-y-1">
        <h2 className="font-medium text-lg">页面不存在</h2>
        <p className="text-muted-foreground text-sm">你访问的地址可能已被移动或删除。</p>
      </div>
      <Button render={<Link to="/" />}>返回首页</Button>
    </div>
  )
}
