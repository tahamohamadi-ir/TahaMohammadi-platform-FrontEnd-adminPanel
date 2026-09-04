import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'
export type HomeModulesAdminOut =
  components['schemas']['HomeModulesAdminOut']
export type HomeModulesPutIn = components['schemas']['HomeModulesPutIn']
export type HomeModuleIn = components['schemas']['HomeModuleIn']
export type HomeModulesRevisionOut =
  components['schemas']['HomeModulesRevisionOut']

export async function fetchHomeModules(
  locale: string,
): Promise<HomeModulesAdminOut> {
  return adminJson<HomeModulesAdminOut>(`/home-modules/${locale}`)
}

/** Full-array bulk save. The If-Match header carries the locale revision from
 * the last GET; the backend answers 428 PRECONDITION_REQUIRED when it is
 * missing and 409 STALE_REVISION when it no longer matches. */
export async function saveHomeModules(
  locale: string,
  payload: HomeModulesPutIn,
  ifMatch: string,
): Promise<HomeModulesRevisionOut> {
  return adminJson<HomeModulesRevisionOut>(`/home-modules/${locale}`, {
    method: 'PUT',
    headers: { 'If-Match': ifMatch, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** Dry-run validation: 200 {} when the payload is clean, 400 VALIDATION with
 * per-path problems otherwise. Nothing is persisted. */
export async function validateHomeModules(
  locale: string,
  payload: HomeModulesPutIn,
): Promise<Record<string, never>> {
  return adminJson<Record<string, never>>(`/home-modules/${locale}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
