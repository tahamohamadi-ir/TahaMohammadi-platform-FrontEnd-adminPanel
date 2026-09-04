import { useQuery } from '@tanstack/react-query'

import { fetchContentHealth, fetchDashboardSummary } from '@/lib/api/dashboard'
import { queryKeys } from '@/lib/query/keys'

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: fetchDashboardSummary,
  })
}

export function useContentHealth() {
  return useQuery({
    queryKey: queryKeys.dashboard.contentHealth,
    queryFn: fetchContentHealth,
  })
}
