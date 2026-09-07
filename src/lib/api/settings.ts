import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

export type SiteSettingsOut = components['schemas']['SiteSettingsOut']
export type SiteSettingsUpdateIn = components['schemas']['SiteSettingsUpdateIn']
export type LocalizedSiteSettingsAdminOut =
  components['schemas']['LocalizedSiteSettingsAdminOut']
export type LocalizedSiteSettingsUpdateIn =
  components['schemas']['LocalizedSiteSettingsUpdateIn']
export type LocalizedSitePublishOut =
  components['schemas']['LocalizedSitePublishOut']

export async function fetchSiteSettings(): Promise<SiteSettingsOut> {
  return adminJson<SiteSettingsOut>('/site')
}

/** Partial update (unset = unchanged). The server enforces optimistic
 * locking: If-Match must carry the updatedAt returned by the last GET,
 * otherwise it answers 409 conflict. */
export async function updateSiteSettings(
  payload: SiteSettingsUpdateIn,
  ifMatch: string,
): Promise<SiteSettingsOut> {
  return adminJson<SiteSettingsOut>('/site', {
    method: 'PUT',
    headers: { 'If-Match': ifMatch, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function fetchLocalizedSiteSettings(
  locale: 'fa' | 'en',
): Promise<LocalizedSiteSettingsAdminOut> {
  return adminJson<LocalizedSiteSettingsAdminOut>(`/site/${locale}`)
}

export async function updateLocalizedSiteSettings(
  locale: 'fa' | 'en',
  payload: LocalizedSiteSettingsUpdateIn,
  ifMatch: string,
): Promise<LocalizedSiteSettingsAdminOut> {
  return adminJson<LocalizedSiteSettingsAdminOut>(`/site/${locale}`, {
    method: 'PUT',
    headers: { 'If-Match': ifMatch, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function publishLocalizedSiteSettings(
  locale: 'fa' | 'en',
): Promise<LocalizedSitePublishOut> {
  return adminJson<LocalizedSitePublishOut>(`/site/${locale}/publish`, {
    method: 'POST',
  })
}
