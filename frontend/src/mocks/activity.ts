import { nowIso } from '@/mocks/db'
import { activityFixtures } from '@/mocks/fixtures/stats'
import type { Activity, ActivityType } from '@/schemas/stats'

/**
 * 活动流的可变存储（对应 `t_activity`）。
 * mock 按 PAD §8「活动流写入时机」在对应业务动作后写入，
 * 因此演示时活动流会随操作（建课 / 传资料 / 交卷 / 提问）真实增长。
 */
const activityStore = {
  items: [] as Activity[],
  seq: 0,
}

export function resetActivities(): void {
  activityStore.items = activityFixtures.map((item) => ({ ...item }))
  activityStore.seq = activityFixtures.length
}

resetActivities()

export function pushActivity(input: {
  type: ActivityType
  target_id: string
  target_type: string
  title: string
}): Activity {
  activityStore.seq += 1
  const activity: Activity = { id: activityStore.seq, created_at: nowIso(), ...input }

  // 写入顺序即倒序（最新在最前），不依赖运行时钟与夹具时间的先后
  activityStore.items.unshift(activity)
  return activity
}

/** 最近 limit 条（已倒序） */
export function listActivities(limit: number): Activity[] {
  return activityStore.items.slice(0, limit)
}
