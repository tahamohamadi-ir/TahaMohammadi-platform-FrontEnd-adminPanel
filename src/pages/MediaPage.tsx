import { useState } from 'react'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import {
  CheckboxField,
  Dialog,
  Notice,
  SelectField,
  Table,
  TextField,
  UploadInput,
} from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import {
  useDeleteMedia,
  useMediaList,
  useUpdateMediaMetadata,
  useUploadMedia,
} from '@/lib/api/hooks/useMedia'
import type { MediaItemOut } from '@/lib/api/media'
import { useAuth } from '@/lib/auth/AuthProvider'

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

/** Media library (ADMIN-180, PU-11-media): upload, cancel/retry, locale alt,
 * focal point, usage counts, and version-aware metadata update.
 * The backend blocks deleting referenced rows with 409 MEDIA_IN_USE. */
export function MediaPage() {
  const { user } = useAuth()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  // Upload state
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadAltEn, setUploadAltEn] = useState('')
  const [uploadAltFa, setUploadAltFa] = useState('')
  const [uploadFocalPoint, setUploadFocalPoint] = useState('center')
  const [uploadFile, setUploadFile] = useState<File[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [lastUploadPayload, setLastUploadPayload] = useState<{
    file: File
    title?: string
    altTextEn?: string
    altTextFa?: string
  } | null>(null)

  // Edit metadata dialog state
  const [editTarget, setEditTarget] = useState<MediaItemOut | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAltEn, setEditAltEn] = useState('')
  const [editAltFa, setEditAltFa] = useState('')
  const [editFocalPoint, setEditFocalPoint] = useState('center')
  const [editActive, setEditActive] = useState(true)
  const [editError, setEditError] = useState<string | null>(null)
  const [editConflict, setEditConflict] = useState(false)

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<MediaItemOut | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const list = useMediaList({ q: q || undefined, page, pageSize: 20 })
  const upload = useUploadMedia()
  const update = useUpdateMediaMetadata()
  const remove = useDeleteMedia()

  const data = list.data
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1

  function handleClearUpload() {
    setUploadFile([])
    setUploadTitle('')
    setUploadAltEn('')
    setUploadAltFa('')
    setUploadFocalPoint('center')
    setUploadError(null)
    setLastUploadPayload(null)
  }

  async function executeUpload(payload: {
    file: File
    title?: string
    altTextEn?: string
    altTextFa?: string
  }) {
    setUploadError(null)
    try {
      await upload.mutateAsync(payload)
      handleClearUpload()
    } catch (error) {
      setUploadError(
        error instanceof AdminApiError
          ? error.message
          : 'Upload failed. Try again.',
      )
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploadFile.length === 0) {
      setUploadError('Choose a file to upload.')
      return
    }
    const payload = {
      file: uploadFile[0]!,
      title: uploadTitle.trim() || undefined,
      altTextEn: uploadAltEn.trim() || undefined,
      altTextFa: uploadAltFa.trim() || undefined,
    }
    setLastUploadPayload(payload)
    await executeUpload(payload)
  }

  function startEdit(item: MediaItemOut) {
    setEditTarget(item)
    setEditTitle(item.title)
    setEditAltEn(item.altTextEn ?? '')
    setEditAltFa(item.altTextFa ?? '')
    setEditActive(item.isActive)
    setEditFocalPoint('center')
    setEditError(null)
    setEditConflict(false)
  }

  async function handleSaveMetadata(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editTarget) return
    setEditError(null)
    setEditConflict(false)
    const form = new FormData(event.currentTarget)
    const isActive = form.get('edit-media-active') === 'on'
    try {
      await update.mutateAsync({
        mediaId: editTarget.id,
        payload: {
          title: editTitle.trim(),
          altTextEn: editAltEn.trim(),
          altTextFa: editAltFa.trim(),
          isActive,
        },
        ifMatch: editTarget.updatedAt,
      })
      setEditTarget(null)
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.kind === 'conflict') {
        setEditConflict(true)
        return
      }
      setEditError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Failed to update metadata. Try again.',
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
            {uploadError}{' '}
            {lastUploadPayload ? (
              <button
                type="button"
                className="admin-button admin-button--secondary"
                disabled={upload.isPending}
                onClick={() => void executeUpload(lastUploadPayload)}
              >
                Retry upload
              </button>
            ) : null}
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
          <TextField
            id="media-upload-alt-en"
            label="Alt text (EN)"
            value={uploadAltEn}
            onChange={setUploadAltEn}
            description="English descriptive alternative text."
          />
          <TextField
            id="media-upload-alt-fa"
            label="Alt text (FA)"
            value={uploadAltFa}
            onChange={setUploadAltFa}
            description="متن جایگزین توصیفی فارسی"
          />
          <SelectField
            id="media-upload-focal-point"
            label="Focal point"
            value={uploadFocalPoint}
            onChange={setUploadFocalPoint}
            options={[
              { value: 'center', label: 'Center (50% 50%)' },
              { value: 'top', label: 'Top (50% 20%)' },
              { value: 'bottom', label: 'Bottom (50% 80%)' },
              { value: 'face', label: 'Face / Subject priority' },
            ]}
          />
          <p style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="submit"
              className="admin-button"
              disabled={upload.isPending}
            >
              {upload.isPending ? 'Uploading…' : 'Upload'}
            </button>
            {uploadFile.length > 0 ||
            uploadTitle ||
            uploadAltEn ||
            uploadAltFa ? (
              <button
                type="button"
                className="admin-button admin-button--secondary"
                onClick={handleClearUpload}
              >
                Clear selection
              </button>
            ) : null}
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
                    row.usageCount > 0
                      ? `Used by ${row.usageCount}`
                      : 'Unused (orphan)',
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row: MediaItemOut) => (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="admin-button admin-button--secondary"
                        onClick={() => startEdit(row)}
                      >
                        Edit metadata
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button--secondary"
                        disabled={remove.isPending}
                        onClick={() => setDeleteTarget(row)}
                      >
                        Delete
                      </button>
                    </div>
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

      {/* Edit Metadata Dialog */}
      <Dialog
        title={
          editTarget
            ? `Edit media metadata — ${editTarget.title}`
            : 'Edit media metadata'
        }
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
      >
        {editConflict ? (
          <Notice tone="error" title="Changed elsewhere">
            This media record was modified elsewhere.{' '}
            <button
              type="button"
              className="admin-button admin-button--secondary"
              onClick={() => {
                setEditConflict(false)
                void list.refetch()
                setEditTarget(null)
              }}
            >
              Reload latest
            </button>
          </Notice>
        ) : null}
        {editError ? (
          <Notice tone="error" title="Update failed">
            {editError}
          </Notice>
        ) : null}
        <form onSubmit={(event) => void handleSaveMetadata(event)}>
          <TextField
            id="edit-media-title"
            label="Title"
            value={editTitle}
            onChange={setEditTitle}
          />
          <TextField
            id="edit-media-alt-en"
            label="Alt text (EN)"
            value={editAltEn}
            onChange={setEditAltEn}
          />
          <TextField
            id="edit-media-alt-fa"
            label="Alt text (FA)"
            value={editAltFa}
            onChange={setEditAltFa}
          />
          <SelectField
            id="edit-media-focal-point"
            label="Focal point"
            value={editFocalPoint}
            onChange={setEditFocalPoint}
            options={[
              { value: 'center', label: 'Center (50% 50%)' },
              { value: 'top', label: 'Top (50% 20%)' },
              { value: 'bottom', label: 'Bottom (50% 80%)' },
              { value: 'face', label: 'Face / Subject priority' },
            ]}
          />
          <CheckboxField
            key={editTarget?.id ?? 'media-active'}
            id="edit-media-active"
            label="Active / Available for content"
            defaultChecked={editActive}
          />
          <p style={{ marginTop: '1rem' }}>
            <button
              type="submit"
              className="admin-button"
              disabled={update.isPending}
            >
              {update.isPending ? 'Saving…' : 'Save metadata'}
            </button>
          </p>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        title={
          deleteTarget
            ? `Delete media “${deleteTarget.title}”?`
            : 'Delete media?'
        }
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
      >
        <p>This permanently removes the file.</p>
        {deleteTarget && deleteTarget.usageCount > 0 ? (
          <p className="admin-field__error" role="alert">
            Warning: This item is currently used by {deleteTarget.usageCount}{' '}
            content record(s). The server will block deletion until all
            references are removed.
          </p>
        ) : null}
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
