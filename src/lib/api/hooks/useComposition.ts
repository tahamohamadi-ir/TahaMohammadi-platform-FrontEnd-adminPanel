import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchCompositionDetail,
  listCompositions,
  updateComposition,
  type CompositionListParams,
  type CompositionUpdateIn,
} from '@/lib/api/composition'
import {
  fetchPublicationJob,
  listPublicationJobs,
  retryPublicationJob,
  type PublicationJobListParams,
  type RetryPublicationJobOptions,
} from '@/lib/api/publication-jobs'

/** React Query hooks over the PU-09-transport adapters (PRODUCT-INTERFACES-V2 §I03/§I06).
 *
 * Query keys are local to this module — the shared `queryKeys` registry is
 * owned outside this packet's allowlist and is deliberately untouched. Every
 * mutation stays pending until the backend confirms it; conflicts surface as
 * `AdminApiError` (kind `conflict`) for the editor to render. */

export const compositionKeys = {
  list: (params: CompositionListParams) =>
    ['composition', 'list', params] as const,
  detail: (pageId: number) => ['composition', 'detail', pageId] as const,
}

export const publicationJobKeys = {
  list: (params: PublicationJobListParams) =>
    ['publication-jobs', 'list', params] as const,
  detail: (jobId: string) => ['publication-jobs', 'detail', jobId] as const,
}

export function useCompositionList(params: CompositionListParams = {}) {
  return useQuery({
    queryKey: compositionKeys.list(params),
    queryFn: () => listCompositions(params),
  })
}

export function useCompositionDetail(pageId: number) {
  return useQuery({
    queryKey: compositionKeys.detail(pageId),
    queryFn: () => fetchCompositionDetail(pageId),
  })
}

export function useUpdateComposition(pageId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      payload,
      ifMatch,
    }: {
      payload: CompositionUpdateIn
      ifMatch: string
    }) => updateComposition(pageId, payload, ifMatch),
    onSuccess: (page) => {
      queryClient.setQueryData(compositionKeys.detail(pageId), page)
      queryClient.invalidateQueries({ queryKey: ['composition', 'list'] })
    },
  })
}

export function usePublicationJobList(params: PublicationJobListParams = {}) {
  return useQuery({
    queryKey: publicationJobKeys.list(params),
    queryFn: () => listPublicationJobs(params),
  })
}

export function usePublicationJobDetail(jobId: string) {
  return useQuery({
    queryKey: publicationJobKeys.detail(jobId),
    queryFn: () => fetchPublicationJob(jobId),
  })
}

export function useRetryPublicationJob(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (options: RetryPublicationJobOptions = {}) =>
      retryPublicationJob(jobId, options),
    onSuccess: (job) => {
      queryClient.setQueryData(publicationJobKeys.detail(jobId), job)
      queryClient.invalidateQueries({ queryKey: ['publication-jobs', 'list'] })
    },
  })
}
