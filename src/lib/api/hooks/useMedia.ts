import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MediaListParams, MediaUpdateIn } from '@/lib/api/media'
import {
  deleteMedia,
  fetchMediaList,
  updateMediaMetadata,
  uploadMedia,
} from '@/lib/api/media'
import { queryKeys } from '@/lib/query/keys'

export function useMediaList(params: MediaListParams) {
  return useQuery({
    queryKey: queryKeys.media.list({
      q: params.q,
      type: params.type,
      active: params.active,
      page: params.page,
      pageSize: params.pageSize,
    }),
    queryFn: () => fetchMediaList(params),
  })
}

function useInvalidateMedia() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['media'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useUploadMedia() {
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: uploadMedia,
    onSuccess: invalidate,
  })
}

export function useUpdateMediaMetadata() {
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: ({
      mediaId,
      payload,
      ifMatch,
    }: {
      mediaId: number
      payload: MediaUpdateIn
      ifMatch: string
    }) => updateMediaMetadata(mediaId, payload, ifMatch),
    onSuccess: invalidate,
  })
}

export function useDeleteMedia() {
  const invalidate = useInvalidateMedia()
  return useMutation({
    mutationFn: (mediaId: number) => deleteMedia(mediaId),
    onSuccess: invalidate,
  })
}
