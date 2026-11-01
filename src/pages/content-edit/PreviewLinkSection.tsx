import { useState } from 'react'

import { Notice } from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import { createPreviewLink, type PreviewLinkOut } from '@/lib/api/preview'

/** Short-lived public preview link for a draft. */
export function PreviewLinkSection({
  entity,
  contentId,
}: {
  entity: string
  contentId: number
}) {
  const [previewLink, setPreviewLink] = useState<PreviewLinkOut | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [creatingPreview, setCreatingPreview] = useState(false)

  async function handleCreatePreviewLink() {
    setPreviewError(null)
    setCreatingPreview(true)
    try {
      setPreviewLink(await createPreviewLink(entity, contentId))
    } catch (error) {
      setPreviewLink(null)
      setPreviewError(
        error instanceof AdminApiError
          ? error.message
          : 'Creating the preview link failed. Try again.',
      )
    } finally {
      setCreatingPreview(false)
    }
  }

  return (
    <section aria-labelledby="share-title" className="admin-panel">
      <h2 id="share-title">Share preview</h2>
      <p className="muted">
        Short-lived public link to the draft; it expires automatically.
      </p>
      {previewError ? (
        <Notice tone="error" title="Preview link failed">
          {previewError}
        </Notice>
      ) : null}
      {previewLink ? (
        <div>
          <p className="break-all">
            <a href={previewLink.url}>{previewLink.url}</a>
          </p>
          <p className="muted">Expires {previewLink.expiresAt}</p>
        </div>
      ) : null}
      <button
        type="button"
        className="admin-button admin-button--secondary"
        disabled={creatingPreview}
        onClick={() => void handleCreatePreviewLink()}
      >
        {creatingPreview ? 'Creating…' : 'Create preview link'}
      </button>
    </section>
  )
}
