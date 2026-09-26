import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { Notice } from '@/components/ui/primitives'
import { fetchAtlasPreviewToken } from '@/lib/api/atlas'
import { AdminApiError } from '@/lib/api/auth'

function toErrorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof AdminApiError) {
    return caught.message
  }
  return fallback
}

/** Locale switch and read-only 3D final preview (Plan B Task 16).
 *
 * Mints a short-lived staff capability per locale and frames the real
 * public renderer: the frame `src` is exactly the returned `preview_url`
 * — fragment included, so the capability never becomes a request
 * parameter and is never written to storage by this page. This page
 * renders no 3D graph itself and never persists the token: it lives only
 * in the query cache and the frame URL. The projection label derives
 * from the served URL (a `/preview/` path is the draft projection,
 * anything else is the honestly-labelled active one), never hard-coded.
 */
export function AtlasPreviewPage() {
  const { versionId } = useParams()
  const id = Number(versionId)
  const validId = Number.isInteger(id) && id > 0
  const [locale, setLocale] = useState<'en' | 'fa'>('en')

  const tokenQuery = useQuery({
    queryKey: [
      'atlas',
      'versions',
      validId ? id : 'unknown',
      'preview',
      locale,
    ],
    queryFn: () => fetchAtlasPreviewToken(id, locale),
    enabled: validId,
  })

  if (!validId) {
    return (
      <main className="page">
        <h1>Atlas preview</h1>
        <Notice tone="error" title="Unknown Atlas version">
          {`No Atlas version matches ${versionId ?? 'this path'}.`}
        </Notice>
      </main>
    )
  }

  const capability = tokenQuery.data ?? null
  const versionMismatch = capability !== null && capability.version_id !== id
  const previewUrl = !versionMismatch ? (capability?.preview_url ?? null) : null
  const isDraftPreview = previewUrl !== null && previewUrl.includes('/preview/')

  return (
    <main className="page">
      <h1>Atlas preview</h1>
      <div role="group" aria-label="Preview locale">
        <button
          type="button"
          className="admin-button admin-button--secondary"
          disabled={locale === 'en'}
          onClick={() => setLocale('en')}
        >
          English
        </button>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          disabled={locale === 'fa'}
          onClick={() => setLocale('fa')}
        >
          Persian
        </button>
      </div>
      {tokenQuery.isPending ? (
        <p role="status">Minting the preview capability…</p>
      ) : null}
      {tokenQuery.error ? (
        <Notice tone="error" title="Failed to mint the preview capability">
          {toErrorMessage(
            tokenQuery.error,
            'Failed to mint the preview capability.',
          )}
        </Notice>
      ) : null}
      {versionMismatch ? (
        <Notice tone="error" title="Preview capability mismatch">
          The minted capability is for a different version. Reload the page and
          try again.
        </Notice>
      ) : null}
      {!tokenQuery.isPending &&
      !tokenQuery.error &&
      !versionMismatch &&
      capability !== null &&
      previewUrl !== null ? (
        <>
          <p>
            Showing the {isDraftPreview ? 'Draft preview' : 'Active'} projection
            ({locale === 'en' ? 'English' : 'Persian'}). Preview access expires{' '}
            {new Date(capability.expires_at * 1000).toUTCString()}.
          </p>
          <p>
            This is a read-only preview of the payload the public Atlas will
            serve.
          </p>
          <iframe title="Atlas 3D preview" src={previewUrl} />
        </>
      ) : null}
    </main>
  )
}
