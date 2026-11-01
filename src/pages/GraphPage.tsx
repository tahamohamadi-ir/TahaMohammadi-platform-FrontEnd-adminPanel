import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Dialog, Notice, SelectField } from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import {
  useActivateGraphVersion,
  useCreateGraphVersion,
  useDuplicateGraphVersion,
  useGraphVersions,
} from '@/lib/api/hooks/useGraph'
import { LoadingState } from '@/components/ui/states'

/** Graph versions (ADMIN-210): drafts are editable and activatable; the
 * active version is immutable (backend 409 IMMUTABLE_ACTIVE / ALREADY_ACTIVE
 * are surfaced verbatim). Any version can be duplicated into a new draft,
 * which is how the live graph gets edited. Node/edge/group editing lives in
 * the per-version editor. */
export function GraphPage() {
  const [locale, setLocale] = useState('en')
  const [activateTarget, setActivateTarget] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [duplicated, setDuplicated] = useState<{
    from: number
    to: number
  } | null>(null)

  const versions = useGraphVersions()
  const create = useCreateGraphVersion()
  const activate = useActivateGraphVersion()
  const duplicate = useDuplicateGraphVersion()

  async function handleDuplicate(versionId: number) {
    setError(null)
    setDuplicated(null)
    try {
      const created = await duplicate.mutateAsync(versionId)
      setDuplicated({ from: versionId, to: created.id })
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Duplicate failed. Try again.',
      )
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await create.mutateAsync(locale)
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Create failed. Try again.',
      )
    }
  }

  async function handleActivate() {
    if (activateTarget === null) return
    setError(null)
    try {
      await activate.mutateAsync(activateTarget)
      setActivateTarget(null)
    } catch (caught) {
      setActivateTarget(null)
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Activate failed. Try again.',
      )
    }
  }

  return (
    <main className="page">
      <h1>Graph editor</h1>

      {error ? (
        <Notice tone="error" title="Action failed">
          {error}
        </Notice>
      ) : null}
      {duplicated ? (
        <Notice tone="success" title={`Draft #${duplicated.to} created`}>
          Copied from version #{duplicated.from}.{' '}
          <Link to={`/graph/${duplicated.to}`}>
            Edit draft #{duplicated.to}
          </Link>
        </Notice>
      ) : null}

      <form onSubmit={(event) => void handleCreate(event)}>
        <SelectField
          id="graph-locale"
          label="Locale"
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'en', label: 'English' },
            { value: 'fa', label: 'فارسی' },
          ]}
        />
        <p>
          <button
            type="submit"
            className="admin-button"
            disabled={create.isPending}
          >
            Create draft
          </button>
        </p>
      </form>

      {versions.isPending ? (
        <LoadingState label="Loading versions…" variant="table" />
      ) : null}
      {versions.error ? (
        <Notice tone="error" title="Versions unavailable">
          The backend did not answer.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void versions.refetch()}
          >
            Retry
          </button>
        </Notice>
      ) : null}

      {versions.data ? (
        <table className="admin-table">
          <caption className="admin-table__caption">Graph versions</caption>
          <thead>
            <tr>
              <th scope="col">Version</th>
              <th scope="col">Locale</th>
              <th scope="col">Status</th>
              <th scope="col">Size</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.data.map((version) => (
              <tr key={version.id}>
                <td>
                  <Link to={`/graph/${version.id}`}>#{version.id}</Link>
                </td>
                <td>{version.locale}</td>
                <td>{version.status}</td>
                <td>
                  {version.nodeCount} nodes · {version.edgeCount} edges
                </td>
                <td>
                  {version.status === 'draft' ? (
                    <>
                      <Link
                        className="admin-button admin-button--secondary"
                        to={`/graph/${version.id}`}
                      >
                        Edit
                      </Link>{' '}
                      <button
                        type="button"
                        className="admin-button admin-button--secondary"
                        onClick={() => setActivateTarget(version.id)}
                      >
                        Activate
                      </button>
                    </>
                  ) : (
                    <span className="muted">Immutable while active</span>
                  )}{' '}
                  <button
                    type="button"
                    className="admin-button admin-button--secondary"
                    aria-label={`Duplicate #${version.id} as draft`}
                    disabled={duplicate.isPending}
                    onClick={() => void handleDuplicate(version.id)}
                  >
                    Duplicate as draft
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <Dialog
        title="Activate this draft?"
        open={activateTarget !== null}
        onClose={() => setActivateTarget(null)}
      >
        <p>
          Activation re-runs the validator, publishes this draft to the public
          site, and archives the currently active version of the locale.
        </p>
        <button
          type="button"
          className="admin-button"
          disabled={activate.isPending}
          onClick={() => void handleActivate()}
        >
          Confirm activate
        </button>
      </Dialog>
    </main>
  )
}
