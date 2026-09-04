import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchSiteSettings,
  updateSiteSettings,
  type SiteSettingsUpdateIn,
} from '@/lib/api/settings'
import { queryKeys } from '@/lib/query/keys'

export function useSiteSettings() {
  return useQuery({
    queryKey: queryKeys.site.settings,
    queryFn: fetchSiteSettings,
  })
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      payload,
      ifMatch,
    }: {
      payload: SiteSettingsUpdateIn
      ifMatch: string
    }) => updateSiteSettings(payload, ifMatch),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.site.settings, settings)
    },
  })
}
