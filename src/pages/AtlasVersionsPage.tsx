import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'

import { Notice, Table, TextField } from '@/components/ui/primitives'
import {
  cloneAtlasVersion,
  createAtlasVersion,
  fetchAtlasVersions,
  type AtlasVersionRow,
} from '@/lib/api/atlas'
import { AdminApiError } from '@/lib/api/auth'

/** Stable key for the Atlas version list — the only query this page owns. */
export const ATLAS_VERSIONS_QUERY_KEY = ['atlas', 'versions'] as const

function toErrorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof AdminApiError) {
    return caught.message
  }
  return fallback
}

function RowActions({ row }: { row: AtlasVersionRow }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [cloneError, setCloneError] = useState<string | null>(null)

  const cloneMutation = useMutation({
    mutationFn: (source: AtlasVersionRow) =>
      cloneAtlasVersion(source.id, `Copy of ${source.label}`),
    onSuccess: (created) => {
      setCloneError(null)
      void queryClient.invalidateQueries({
        queryKey: ATLAS_VERSIONS_QUERY_KEY,
      })
      navigate(`/atlas/${created.id}`)
    },
    onError: (caught) => {
      setCloneError(toErrorMessage(caught, 'Failed to clone the version.'))
    },
  })

  return (
    <>
      {row.status === 'draft' ? (
        <Link to={`/atlas/${row.id}`}>Open editor</Link>
      ) : null}
      {row.status === 'active' ? (
        <Link to={`/atlas/${row.id}/preview`}>Open preview</Link>
      ) : null}
      <button
        type="button"
        className="admin-button admin-button--secondary"
        onClick={() => cloneMutation.mutate(row)}
        disabled={cloneMutation.isPending}
      >
        {cloneMutation.isPending ? 'Cloning…' : 'Clone to draft'}
      </button>
      {cloneError ? (
        <Notice tone="error" title="Failed to clone the version">
          {cloneError}
        </Notice>
      ) : null}
    </>
  )
}

/** Atlas versions and draft status (Plan B Task 10).
 *
 * Server-authoritative lifecycle surface: Draft rows open the editor,
 * the Active row is marked and limited to Clone + Open preview (immutable),
 * Archived rows offer Clone only. Clone/Create navigate to the id the
 * server returns — no client-side lifecycle transitions are invented.
 *
 * Note: the list row (`AtlasVersionRowOut`) carries no `publishedAt`
 * (it lives on the detail endpoint), so the table shows the row's own
 * `updatedAt` instead of fetching per-row detail.
 */
export function AtlasVersionsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [label, setLabel] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const versionsQuery = useQuery({
    queryKey: ATLAS_VERSIONS_QUERY_KEY,
    queryFn: fetchAtlasVersions,
  })

  const createMutation = useMutation({
    mutationFn: (nextLabel: string) => createAtlasVersion(nextLabel),
    onSuccess: (created) => {
      setCreateError(null)
      setLabel('')
      void queryClient.invalidateQueries({
        queryKey: ATLAS_VERSIONS_QUERY_KEY,
      })
      navigate(`/atlas/${created.id}`)
    },
    onError: (caught) => {
      setCreateError(toErrorMessage(caught, 'Failed to create the draft.'))
    },
  })

  return (
    <main className="page">
      <h1>Atlas versions</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = label.trim()
          if (trimmed.length === 0 || createMutation.isPending) {
            return
          }
          createMutation.mutate(trimmed)
        }}
      >
        <TextField
          id="atlas-new-draft-label"
          label="New draft label"
          value={label}
          onChange={setLabel}
        />
        <button
          type="submit"
          className="admin-button admin-button--secondary"
          disabled={label.trim().length === 0 || createMutation.isPending}
        >
          {createMutation.isPending ? 'Creating…' : 'Create draft'}
        </button>
      </form>
      {createError ? (
        <Notice tone="error" title="Failed to create the draft">
          {createError}
        </Notice>
      ) : null}

      {versionsQuery.isPending ? (
        <p role="status">Loading Atlas versions…</p>
      ) : null}
      {versionsQuery.error ? (
        <Notice tone="error" title="Failed to load Atlas versions">
          {toErrorMessage(
            versionsQuery.error,
            'Failed to load Atlas versions.',
          )}
        </Notice>
      ) : null}
      {versionsQuery.data ? (
        <Table<AtlasVersionRow>
          caption="Atlas versions"
          rows={versionsQuery.data}
          rowKey={(row) => row.id}
          emptyMessage="No Atlas versions yet."
          columns={[
            { key: 'label', header: 'Label', render: (row) => row.label },
            {
              key: 'status',
              header: 'Status',
              render: (row) =>
                row.status === 'active' ? (
                  <strong aria-current="true">Active</strong>
                ) : (
                  row.status
                ),
            },
            {
              key: 'nodeCount',
              header: 'Nodes',
              render: (row) => String(row.nodeCount),
            },
            {
              key: 'relationCount',
              header: 'Relations',
              render: (row) => String(row.relationCount),
            },
            {
              key: 'updatedAt',
              header: 'Updated',
              render: (row) => row.updatedAt,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => <RowActions row={row} />,
            },
          ]}
        />
      ) : null}
    </main>
  )
}
