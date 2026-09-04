import { useState } from 'react'
import { Link } from 'react-router-dom'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import {
  Dialog,
  Notice,
  SelectField,
  Table,
  TextField,
} from '@/components/ui/primitives'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useContentList } from '@/lib/api/hooks/useContent'
import { AdminApiError } from '@/lib/api/auth'
import { bulkArchiveContent } from '@/lib/api/content'
import { CONTENT_STATUSES } from '@/lib/api/content'

const ENTITY_LABELS: Record<string, string> = {
  article: 'Articles',
  series: 'Series',
  'research-topic': 'Research topics',
  'research-statement': 'Research statements',
  project: 'Projects',
  publication: 'Publications',
  book: 'Books',
  talk: 'Talks',
  download: 'Downloads',
  course: 'Courses',
  'creative-work': 'Creative work',
  landing: 'Landings',
  profile: 'Profiles',
}

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity
}

/** Content list + filters + pagination (ADMIN-160/170). One generic page for
 * every backend content entity; every row links into the shared editor. */
export function ContentListPage({ entity }: { entity: string }) {
  const { user } = useAuth()
  const [locale, setLocale] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number[]>([])
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkPending, setBulkPending] = useState(false)
  const list = useContentList(entity, {
    locale: locale || undefined,
    status: status || undefined,
    q: q || undefined,
    page,
    pageSize: 20,
  })
  const bulkEnabled = user?.featureFlags?.['admin_bulk_archive'] === true

  const data = list.data
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1

  function toggleSelected(id: number, checked: boolean) {
    setSelected((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((at) => at !== id),
    )
  }

  async function handleBulkArchive() {
    setBulkError(null)
    setBulkPending(true)
    try {
      const result = await bulkArchiveContent(entity, {
        ids: selected,
        reason: 'bulk archive from list',
      })
      setBulkMessage(`Archived ${result.archived}; skipped ${result.skipped}.`)
      setSelected([])
      setConfirmBulk(false)
      void list.refetch()
    } catch (caught) {
      setConfirmBulk(false)
      setBulkError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Bulk archive failed. Try again.',
      )
    } finally {
      setBulkPending(false)
    }
  }

  return (
    <main className="page">
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <h1>{entityLabel(entity)}</h1>
      <p>
        <Link className="admin-button" to={`/content/${entity}/new`}>
          New {entityLabel(entity).replace(/s$/, '').toLowerCase()}
        </Link>
      </p>

      <div className="admin-filter-bar">
        <TextField
          id="content-search"
          label="Search"
          value={q}
          onChange={(value) => {
            setQ(value)
            setPage(1)
          }}
        />
        <SelectField
          id="content-locale"
          label="Locale"
          value={locale}
          onChange={(value) => {
            setLocale(value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'All locales' },
            { value: 'en', label: 'English' },
            { value: 'fa', label: 'فارسی' },
          ]}
        />
        <SelectField
          id="content-status"
          label="Status"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'All statuses' },
            ...CONTENT_STATUSES.map((value) => ({ value, label: value })),
          ]}
        />
      </div>

      {list.isPending ? <p role="status">Loading rows…</p> : null}

      {list.error ? (
        <Notice tone="error" title="List unavailable">
          The backend did not answer.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void list.refetch()}
          >
            Retry
          </button>
        </Notice>
      ) : null}

      {bulkMessage ? <p role="status">{bulkMessage}</p> : null}
      {bulkError ? (
        <Notice tone="error" title="Bulk archive failed">
          {bulkError}
        </Notice>
      ) : null}
      {bulkEnabled && data ? (
        <p>
          <button
            type="button"
            className="admin-button"
            disabled={selected.length === 0 || bulkPending}
            onClick={() => setConfirmBulk(true)}
          >
            Archive selected ({selected.length})
          </button>
        </p>
      ) : data ? (
        <p className="muted">
          Bulk archive is disabled on the server (FEATURE_ADMIN_BULK_ARCHIVE);
          archive rows individually.
        </p>
      ) : null}

      {!list.isPending && !list.error && data ? (
        <>
          <Table
            caption={`${entityLabel(entity)} rows`}
            columns={[
              ...(bulkEnabled
                ? [
                    {
                      key: 'select',
                      header: 'Select',
                      render: (row: { id: number }) => (
                        <input
                          type="checkbox"
                          aria-label={`Select row ${row.id}`}
                          checked={selected.includes(row.id)}
                          onChange={(event) =>
                            toggleSelected(row.id, event.currentTarget.checked)
                          }
                        />
                      ),
                    },
                  ]
                : []),
              {
                key: 'title',
                header: 'Title',
                render: (row) => (
                  <Link to={`/content/${entity}/${row.id}`}>
                    {row.title} ({row.locale})
                  </Link>
                ),
              },
              { key: 'slug', header: 'Slug' },
              { key: 'status', header: 'Status' },
              { key: 'updatedAt', header: 'Updated' },
            ]}
            rows={data.items}
            rowKey={(row) => row.id}
            emptyMessage={`No ${entityLabel(entity).toLowerCase()} yet.`}
          />
          <div className="admin-pagination">
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous page
            </button>
            <span>
              Page {data.page} of {totalPages} ({data.total} rows)
            </span>
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next page
            </button>
          </div>
        </>
      ) : null}

      <Dialog
        title="Archive selected rows?"
        open={confirmBulk}
        onClose={() => setConfirmBulk(false)}
      >
        <p>
          {selected.length} row(s) will move to archived. Invalid transitions
          are skipped by the backend and reported.
        </p>
        <button
          type="button"
          className="admin-button"
          disabled={bulkPending}
          onClick={() => void handleBulkArchive()}
        >
          Confirm archive
        </button>
      </Dialog>
    </main>
  )
}
