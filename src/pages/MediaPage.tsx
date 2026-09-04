import { useState } from 'react'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import {
  Dialog,
  Notice,
  Table,
  TextField,
  UploadInput,
} from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import {
  useDeleteMedia,
  useMediaList,
  useUploadMedia,
} from '@/lib/api/hooks/useMedia'
import type { MediaItemOut } from '@/lib/api/media'
import { useAuth } from '@/lib/auth/AuthProvider'

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

/** Media library (ADMIN-180): upload, metadata, usage, delete protection.
 * The backend blocks deleting referenced rows with 409 MEDIA_IN_USE; that
 * guard result is shown verbatim instead of hidden. */
export function MediaPage() {
  const { user } = useAuth()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadFile, setUploadFile] = useState<File[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MediaItemOut | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const list = useMediaList({ q: q || undefined, page, pageSize: 20 })
  const upload = useUploadMedia()
  const remove = useDeleteMedia()

  const data = list.data
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setUploadError(null)
    if (uploadFile.length === 0) {
      setUploadError('Choose a file to upload.')
      return
    }
    try {
      await upload.mutateAsync({
        file: uploadFile[0]!,
        title: uploadTitle.trim() || undefined,
      })
      setUploadFile([])
      setUploadTitle('')
    } catch (error) {
      setUploadError(
        error instanceof AdminApiError
          ? error.message
          : 'Upload failed. Try again.',
      )
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    try {
      await remove.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (error) {
      setDeleteError(
        error instanceof AdminApiError
          ? error.message
          : 'Delete failed. Try again.',
      )
      setDeleteTarget(null)
    }
  }

  return (
    <main className="page">
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <h1>Media library</h1>

      <section aria-labelledby="upload-title">
        <h2 id="upload-title">Upload</h2>
        {uploadError ? (
          <Notice tone="error" title="Upload failed">
            {uploadError}
          </Notice>
        ) : null}
        <form onSubmit={(event) => void handleUpload(event)}>
          <UploadInput
            id="media-upload-file"
            label="Upload file"
            onChange={setUploadFile}
          />
          <TextField
            id="media-upload-title"
            label="Upload title"
            value={uploadTitle}
            onChange={setUploadTitle}
          />
          <p>
            <button
              type="submit"
              className="admin-button"
              disabled={upload.isPending}
            >
              {upload.isPending ? 'Uploading…' : 'Upload'}
            </button>
          </p>
        </form>
      </section>

      <section aria-labelledby="library-title">
        <h2 id="library-title">Library</h2>
        <TextField
          id="media-search"
          label="Search"
          value={q}
          onChange={(value) => {
            setQ(value)
            setPage(1)
          }}
        />
        {list.isPending ? <p role="status">Loading media…</p> : null}
        {list.error ? (
          <Notice tone="error" title="Media unavailable">
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
        {deleteError ? (
          <Notice tone="error" title="Delete blocked">
            {deleteError}
          </Notice>
        ) : null}
        {data ? (
          <>
            <Table
              caption="Media library"
              columns={[
                { key: 'title', header: 'Title' },
                { key: 'mime', header: 'Type' },
                {
                  key: 'size',
                  header: 'Size',
                  render: (row) => formatBytes(row.size),
                },
                {
                  key: 'usageCount',
                  header: 'Usage',
                  render: (row: { usageCount: number }) =>
                    row.usageCount > 0 ? `Used by ${row.usageCount}` : 'Unused',
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      disabled={remove.isPending}
                      onClick={() => setDeleteTarget(row)}
                    >
                      Delete
                    </button>
                  ),
                },
              ]}
              rows={data.items}
              rowKey={(row) => row.id}
              emptyMessage="No media uploaded yet."
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
      </section>

      <Dialog
        title={
          deleteTarget
            ? `Delete media “${deleteTarget.title}”?`
            : 'Delete media?'
        }
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
      >
        <p>
          This permanently removes the file. Rows still referencing it are
          protected by the backend.
        </p>
        <button
          type="button"
          className="admin-button"
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          Confirm delete
        </button>
      </Dialog>
    </main>
  )
}
