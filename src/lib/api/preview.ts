import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

export type PreviewLinkOut = components['schemas']['PreviewLinkOut']

/** The backend's PREVIEW_SHARE_ENTITIES allowlist (admin_content.py).
 * Preview links are a 404 for anything else. */
export const PREVIEW_SHARE_ENTITIES = ['landing', 'profile', 'article'] as const

export function entitySupportsPreview(entity: string): boolean {
  return (PREVIEW_SHARE_ENTITIES as readonly string[]).includes(entity)
}

export async function createPreviewLink(
  entity: string,
  id: number,
): Promise<PreviewLinkOut> {
  return adminJson<PreviewLinkOut>(`/content/${entity}/${id}/preview-link`, {
    method: 'POST',
  })
}
