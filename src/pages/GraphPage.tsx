import { useState } from 'react'
import { Link } from 'react-router-dom'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import { Dialog, Notice, SelectField } from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import {
  useActivateGraphVersion,
  useCreateGraphVersion,
  useGraphVersions,
} from '@/lib/api/hooks/useGraph'
import { useAuth } from '@/lib/auth/AuthProvider'

/** Graph versions (ADMIN-210): drafts are editable and activatable; the
 * active version is immutable (backend 409 IMMUTABLE_ACTIVE / ALREADY_ACTIVE
 * are surfaced verbatim). Node/edge/group editing lives in the per-version
 * editor. */
export function GraphPage() {
  const { user } = useAuth()
  const [locale, setLocale] = useState('en')
  const [activateTarget, setActivateTarget] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const versions = useGraphVersions()
  const create = useCreateGraphVersion()
  const activate = useActivateGraphVersion()

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
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <h1>Graph editor</h1>

      {error ? (
        <Notice tone="error" title="Action failed">
          {error}
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

      {versions.isPending ? <p role="status">Loading versions…</p> : null}
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
                        className="admin-nav__link"
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
                  )}
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
