import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  ContentCreateIn,
  ContentListParams,
  ContentUpdateIn,
} from '@/lib/api/content'
import {
  createContent,
  fetchContentDetail,
  fetchContentSchema,
  listContent,
  transitionContent,
  updateContent,
} from '@/lib/api/content'
import { queryKeys } from '@/lib/query/keys'

export function useContentList(entity: string, params: ContentListParams) {
  return useQuery({
    queryKey: queryKeys.content.list(entity, {
      locale: params.locale,
      status: params.status,
      q: params.q,
      page: params.page,
      pageSize: params.pageSize,
    }),
    queryFn: () => listContent(entity, params),
  })
}

export function useContentDetail(entity: string, id: number) {
  return useQuery({
    queryKey: queryKeys.content.detail(entity, id),
    queryFn: () => fetchContentDetail(entity, id),
  })
}

export function useContentSchema() {
  return useQuery({
    queryKey: ['content', 'schema'] as const,
    queryFn: fetchContentSchema,
  })
}

function useInvalidateContent(entity: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['content', entity] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useCreateContent(entity: string) {
  const invalidate = useInvalidateContent(entity)
  return useMutation({
    mutationFn: (payload: ContentCreateIn) => createContent(entity, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateContent(entity: string) {
  const invalidate = useInvalidateContent(entity)
  return useMutation({
    mutationFn: ({
      id,
      payload,
      ifMatch,
    }: {
      id: number
      payload: ContentUpdateIn
      ifMatch: string
    }) => updateContent(entity, id, payload, ifMatch),
    onSuccess: invalidate,
  })
}

export function useTransitionContent(entity: string) {
  const invalidate = useInvalidateContent(entity)
  return useMutation({
    mutationFn: ({
      id,
      to,
      reason,
      scheduledFor,
    }: {
      id: number
      to: string
      reason?: string | null
      scheduledFor?: string | null
    }) => transitionContent(entity, id, { to, reason, scheduledFor }),
    onSuccess: invalidate,
  })
}
