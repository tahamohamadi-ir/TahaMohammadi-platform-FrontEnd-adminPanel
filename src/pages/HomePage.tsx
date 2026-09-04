import { useState } from 'react'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import { Notice, SelectField } from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import type { HomeModuleIn, HomeModulesPutIn } from '@/lib/api/home'
import {
  useHomeModules,
  useSaveHomeModules,
  useValidateHomeModules,
} from '@/lib/api/hooks/useHome'
import { useAuth } from '@/lib/auth/AuthProvider'

const SELECTION_MODES = ['manual', 'latest', 'top'] as const

/** Locale switch shared by composition-style pages. */
export function LocaleTabs({
  locale,
  onChange,
}: {
  locale: 'en' | 'fa'
  onChange: (locale: 'en' | 'fa') => void
}) {
  return (
    <div role="tablist" aria-label="Locale" className="admin-nav">
      {(['en', 'fa'] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={locale === value}
          className="admin-nav__link"
          onClick={() => onChange(value)}
        >
          {value === 'en' ? 'English' : 'فارسی'}
        </button>
      ))}
    </div>
  )
}

/** Home module composition (ADMIN-190). Full-array bulk save with the
 * locale-level If-Match revision; server-side dry-run validate before save.
 * Module keys come from the backend's canonical set — the page never
 * invents a slot. */
export function HomePage() {
  const { user } = useAuth()
  const [locale, setLocale] = useState<'en' | 'fa'>('en')
  const [draft, setDraft] = useState<HomeModuleIn[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const modules = useHomeModules(locale)
  const validate = useValidateHomeModules(locale)
  const save = useSaveHomeModules(locale)

  const data = modules.data
  const current: HomeModuleIn[] =
    draft ??
    data?.modules.map((module) => ({
      key: module.key,
      visible: module.visible,
      order: module.order,
      selection_mode: module.selection_mode,
      provenance_note: module.provenance_note,
    })) ??
    []

  function updateModule(index: number, patch: Partial<HomeModuleIn>) {
    setDraft(
      current.map((module, at) =>
        at === index ? { ...module, ...patch } : module,
      ),
    )
    setMessage(null)
    setError(null)
  }

  function moveModule(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= current.length) return
    const next = [...current]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved!)
    setDraft(next.map((module, at) => ({ ...module, order: at + 1 })))
    setMessage(null)
    setError(null)
  }

  function payload(): HomeModulesPutIn {
    return {
      modules: current.map((module, at) => ({
        ...module,
        order: at + 1,
      })),
    }
  }

  async function handleValidate() {
    setError(null)
    try {
      await validate.mutateAsync(payload())
      setMessage('Composition is valid.')
    } catch (caught) {
      setMessage(null)
      setError(
        caught instanceof AdminApiError
          ? `${caught.message} ${Object.entries(caught.fieldErrors)
              .map(([path, why]) => `${path}: ${why}`)
              .join(' · ')}`
          : 'Validation failed. Try again.',
      )
    }
  }

  async function handleSave() {
    setError(null)
    if (!data) return
    try {
      await save.mutateAsync({ payload: payload(), ifMatch: data.revision })
      setDraft(null)
      setMessage('Composition saved.')
    } catch (caught) {
      setMessage(null)
      if (caught instanceof AdminApiError && caught.kind === 'conflict') {
        setError('The composition changed elsewhere. Reload latest and retry.')
        return
      }
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Save failed. Try again.',
      )
    }
  }

  return (
    <main className="page">
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <h1>Home composition</h1>
      <LocaleTabs
        locale={locale}
        onChange={(next) => {
          setLocale(next)
          setDraft(null)
          setMessage(null)
          setError(null)
        }}
      />

      {message ? <p role="status">{message}</p> : null}
      {error ? (
        <Notice tone="error" title="Action failed">
          {error}{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => {
              setError(null)
              setDraft(null)
              void modules.refetch()
            }}
          >
            Reload latest
          </button>
        </Notice>
      ) : null}

      {modules.isPending ? <p role="status">Loading composition…</p> : null}
      {modules.error ? (
        <Notice tone="error" title="Composition unavailable">
          The backend did not answer.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void modules.refetch()}
          >
            Retry
          </button>
        </Notice>
      ) : null}

      {data ? (
        <>
          <ol className="admin-home-modules">
            {current.map((module, index) => (
              <li key={module.key} className="admin-home-module">
                <div>
                  <strong>{module.key}</strong>{' '}
                  <span className="muted">order {index + 1}</span>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={module.visible}
                    onChange={(event) =>
                      updateModule(index, {
                        visible: event.currentTarget.checked,
                      })
                    }
                  />{' '}
                  Visible
                </label>
                <SelectField
                  id={`mode-${module.key}`}
                  label="Selection mode"
                  value={module.selection_mode}
                  onChange={(value) =>
                    updateModule(index, { selection_mode: value })
                  }
                  options={SELECTION_MODES.map((value) => ({
                    value,
                    label: value,
                  }))}
                />
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  disabled={index === 0}
                  onClick={() => moveModule(index, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  disabled={index === current.length - 1}
                  onClick={() => moveModule(index, 1)}
                >
                  Move down
                </button>
              </li>
            ))}
          </ol>
          <p>
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={validate.isPending}
              onClick={() => void handleValidate()}
            >
              Validate
            </button>{' '}
            <button
              type="button"
              className="admin-button"
              disabled={save.isPending}
              onClick={() => void handleSave()}
            >
              {save.isPending ? 'Saving…' : 'Save composition'}
            </button>
          </p>
        </>
      ) : null}
    </main>
  )
}
