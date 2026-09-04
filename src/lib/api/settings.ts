import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

export type SiteSettingsOut = components['schemas']['SiteSettingsOut']
export type SiteSettingsUpdateIn = components['schemas']['SiteSettingsUpdateIn']

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
