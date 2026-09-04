import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createContentRevision,
  fetchContentRevisions,
  restoreContentRevision,
} from '@/lib/api/revisions'

export function useContentRevisions(entity: string, id: number) {
  return useQuery({
    queryKey: ['content', entity, 'revisions', id] as const,
    queryFn: () => fetchContentRevisions(entity, id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

function useInvalidateContent(entity: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['content', entity] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useCreateContentRevision(entity: string, id: number) {
  const invalidate = useInvalidateContent(entity)
  return useMutation({
    mutationFn: (payload: { note?: string | null }) =>
      createContentRevision(entity, id, payload),
    onSuccess: invalidate,
  })
}

export function useRestoreContentRevision(entity: string, id: number) {
  const invalidate = useInvalidateContent(entity)
  return useMutation({
    mutationFn: (revisionId: number) =>
      restoreContentRevision(entity, id, revisionId),
    onSuccess: invalidate,
  })
}
