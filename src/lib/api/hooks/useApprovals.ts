import { useQuery } from '@tanstack/react-query'

import type { ApprovalStateFilter } from '@/lib/api/approvals'
import { fetchApprovalQueue } from '@/lib/api/approvals'

export function useApprovalQueue(state: ApprovalStateFilter) {
  return useQuery({
    queryKey: ['approvals', 'queue', state] as const,
    queryFn: () => fetchApprovalQueue(state),
  })
}
