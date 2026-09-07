import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchLocalizedSiteSettings,
  fetchSiteSettings,
  publishLocalizedSiteSettings,
  updateLocalizedSiteSettings,
  updateSiteSettings,
  type LocalizedSiteSettingsUpdateIn,
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

export function useLocalizedSiteSettings(locale: 'fa' | 'en') {
  return useQuery({
    queryKey: ['site', 'localized', locale] as const,
    queryFn: () => fetchLocalizedSiteSettings(locale),
  })
}

export function useUpdateLocalizedSiteSettings(locale: 'fa' | 'en') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      payload,
      ifMatch,
    }: {
      payload: LocalizedSiteSettingsUpdateIn
      ifMatch: string
    }) => updateLocalizedSiteSettings(locale, payload, ifMatch),
    onSuccess: (settings) => {
      queryClient.setQueryData(['site', 'localized', locale], settings)
    },
  })
}

export function usePublishLocalizedSiteSettings(locale: 'fa' | 'en') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => publishLocalizedSiteSettings(locale),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['site', 'localized', locale],
      })
    },
  })
}
