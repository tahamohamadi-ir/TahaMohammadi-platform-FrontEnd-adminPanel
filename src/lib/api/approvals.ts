import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

export type ApprovalQueueItemOut = components['schemas']['ApprovalQueueItemOut']
export type ApprovalQueueOut = components['schemas']['ApprovalQueueOut']

export type ApprovalStateFilter = 'all' | 'approved' | 'not-approved'

export async function fetchApprovalQueue(
  state: ApprovalStateFilter = 'not-approved',
): Promise<ApprovalQueueOut> {
  const query = state === 'not-approved' ? '' : `?state=${state}`
  return adminJson<ApprovalQueueOut>(`/approval-queue${query}`)
}
