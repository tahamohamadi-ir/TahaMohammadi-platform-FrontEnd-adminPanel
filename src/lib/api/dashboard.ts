import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

export type DashboardSummaryOut = components['schemas']['DashboardSummaryOut']
export type ContentHealthOut = components['schemas']['ContentHealthOut']

export async function fetchDashboardSummary(): Promise<DashboardSummaryOut> {
  return adminJson<DashboardSummaryOut>('/dashboard/summary')
}

export async function fetchContentHealth(): Promise<ContentHealthOut> {
  return adminJson<ContentHealthOut>('/overview/content-health')
}
