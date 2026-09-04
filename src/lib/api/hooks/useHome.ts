import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { HomeModulesPutIn } from '@/lib/api/home'
import {
  fetchHomeModules,
  saveHomeModules,
  validateHomeModules,
} from '@/lib/api/home'

export function useHomeModules(locale: string) {
  return useQuery({
    queryKey: ['home', 'modules', locale] as const,
    queryFn: () => fetchHomeModules(locale),
  })
}

function useInvalidateHome(locale: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({
      queryKey: ['home', 'modules', locale],
    })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useSaveHomeModules(locale: string) {
  const invalidate = useInvalidateHome(locale)
  return useMutation({
    mutationFn: ({
      payload,
      ifMatch,
    }: {
      payload: HomeModulesPutIn
      ifMatch: string
    }) => saveHomeModules(locale, payload, ifMatch),
    onSuccess: invalidate,
  })
}

export function useValidateHomeModules(locale: string) {
  return useMutation({
    mutationFn: (payload: HomeModulesPutIn) =>
      validateHomeModules(locale, payload),
  })
}
