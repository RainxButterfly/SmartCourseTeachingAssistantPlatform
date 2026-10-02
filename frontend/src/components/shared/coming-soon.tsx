import { Construction } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ComingSoonProps {
  title: string
  description?: string
  children?: ReactNode
}

/**
 * 脚手架阶段的占位页：每实现一个模块即替换对应路由的 element。
 * 不承载业务逻辑，仅用于保证路由表与布局可运行、可验收。
 */
export function ComingSoon({ title, description, children }: ComingSoonProps) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-muted">
          <Construction aria-hidden="true" className="size-4 text-muted-foreground" />
        </div>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        {children ?? '该模块尚未实现，将按 PAD 功能清单逐个交付。'}
      </CardContent>
    </Card>
  )
}
