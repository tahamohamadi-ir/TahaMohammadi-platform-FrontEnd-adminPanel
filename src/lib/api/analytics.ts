import { adminJson } from '@/lib/api/auth'

export interface AnalyticsRow {
  date: string
  pagePath: string
  locale: string
  event: string
  target: string
  count: number
}

export interface AnalyticsReportOut {
  from: string
  to: string
  timezone: string
  updatedAt: string
  metric: string
  rows: AnalyticsRow[]
}

export interface AnalyticsFilter {
  from?: string
  to?: string
  locale?: string
}

/** Fetches first-party aggregate analytics report (§I07).
 * Authentication with staff session + OTP required. */
export async function fetchAnalyticsReport(
  filter?: AnalyticsFilter,
): Promise<AnalyticsReportOut> {
  const params = new URLSearchParams()
  if (filter?.from) params.set('from', filter.from)
  if (filter?.to) params.set('to', filter.to)
  if (filter?.locale && filter.locale !== 'all')
    params.set('locale', filter.locale)
  const qs = params.toString()
  return adminJson<AnalyticsReportOut>(`/analytics${qs ? `?${qs}` : ''}`)
}
