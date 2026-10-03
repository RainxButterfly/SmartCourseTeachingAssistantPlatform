import { MessageSquareText, NotebookPen, Paperclip } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button'

/** 快捷入口（PAD §6.2 DashboardPage）：上传资料需先选课程，因此指向课程列表 */
const QUICK_ACTIONS = [
  { to: '/courses', label: '上传资料', hint: '进入课程后上传', icon: Paperclip },
  { to: '/chat', label: '新建对话', hint: '基于课程资料提问', icon: MessageSquareText },
  { to: '/quiz', label: '开始练习', hint: '按薄弱点智能出题', icon: NotebookPen },
] as const

/**
 * 导航一律用样式化的 <Link>（保留 link 角色），
 * 不用 Button + render={<Link/>}——那样会留下 role="button" 的假按钮。
 */
export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.to}
          to={action.to}
          title={action.hint}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <action.icon aria-hidden="true" />
          {action.label}
        </Link>
      ))}
    </div>
  )
}
