import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { TimelineCreateIn, TimelinePatchIn } from '@/lib/api/timeline'
import {
  createTimelineRecord,
  deleteTimelineRecord,
  fetchTimeline,
  reorderTimeline,
  updateTimelineRecord,
} from '@/lib/api/timeline'

export function useTimeline(locale: string) {
  return useQuery({
    queryKey: ['timeline', locale] as const,
    queryFn: () => fetchTimeline(locale),
  })
}

function useInvalidateTimeline(locale: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['timeline', locale] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useCreateTimelineRecord(locale: string) {
  const invalidate = useInvalidateTimeline(locale)
  return useMutation({
    mutationFn: (payload: TimelineCreateIn) =>
      createTimelineRecord(locale, payload),
    onSuccess: invalidate,
  })
}

export function useReorderTimeline(locale: string) {
  const invalidate = useInvalidateTimeline(locale)
  return useMutation({
    mutationFn: (ids: number[]) => reorderTimeline(locale, ids),
    onSuccess: invalidate,
  })
}

export function useUpdateTimelineRecord(locale: string) {
  const invalidate = useInvalidateTimeline(locale)
  return useMutation({
    mutationFn: ({
      id,
      payload,
      ifMatch,
    }: {
      id: number
      payload: TimelinePatchIn
      ifMatch: string
    }) => updateTimelineRecord(locale, id, payload, ifMatch),
    onSuccess: invalidate,
  })
}

export function useDeleteTimelineRecord(locale: string) {
  const invalidate = useInvalidateTimeline(locale)
  return useMutation({
    mutationFn: ({ id, ifMatch }: { id: number; ifMatch: string }) =>
      deleteTimelineRecord(locale, id, ifMatch),
    onSuccess: invalidate,
  })
}
