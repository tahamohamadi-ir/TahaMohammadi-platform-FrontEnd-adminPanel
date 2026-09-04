import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { GraphPayloadIn } from '@/lib/api/graph'
import {
  activateGraphVersion,
  createGraphVersion,
  fetchGraphDetail,
  fetchGraphValidation,
  fetchGraphVersions,
  saveGraphPayload,
} from '@/lib/api/graph'

export function useGraphVersions() {
  return useQuery({
    queryKey: ['graph', 'versions'] as const,
    queryFn: fetchGraphVersions,
  })
}

function useInvalidateGraph(versionId?: number) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['graph'] })
    if (versionId !== undefined) {
      void queryClient.invalidateQueries({
        queryKey: ['graph', 'detail', versionId],
      })
    }
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useCreateGraphVersion() {
  const invalidate = useInvalidateGraph()
  return useMutation({
    mutationFn: (locale: string) => createGraphVersion(locale),
    onSuccess: invalidate,
  })
}

export function useGraphDetail(versionId: number) {
  return useQuery({
    queryKey: ['graph', 'detail', versionId] as const,
    queryFn: () => fetchGraphDetail(versionId),
    enabled: Number.isFinite(versionId) && versionId > 0,
  })
}

export function useSaveGraphPayload(versionId: number) {
  const invalidate = useInvalidateGraph(versionId)
  return useMutation({
    mutationFn: ({
      payload,
      ifMatch,
    }: {
      payload: GraphPayloadIn
      ifMatch: string
    }) => saveGraphPayload(versionId, payload, ifMatch),
    onSuccess: invalidate,
  })
}

export function useActivateGraphVersion() {
  const invalidate = useInvalidateGraph()
  return useMutation({
    mutationFn: (versionId: number) => activateGraphVersion(versionId),
    onSuccess: invalidate,
  })
}

export function useGraphValidation(versionId: number) {
  return useQuery({
    queryKey: ['graph', 'validation', versionId] as const,
    queryFn: () => fetchGraphValidation(versionId),
    enabled: Number.isFinite(versionId) && versionId > 0,
  })
}
