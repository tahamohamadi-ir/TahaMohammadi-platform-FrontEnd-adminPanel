import { useState } from 'react'

import { Notice, SelectField, TextField } from '@/components/ui/primitives'
import type { LocalizedSiteSettingsAdminOut } from '@/lib/api/settings'
import { LinkIcon, TypeIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'

/* Fieldsets of the localized settings form (§I04). Uncontrolled fields are
 * read by name in LocalizedSettingsSection's submit handler; the two
 * editable lists are controlled and owned by that section. */

export interface NavLinkDraft {
  label: string
  href: string
}

export interface CopyEntryDraft {
  key: string
  value: string
}

/** Managed-copy keys the public Home hero reads (HeroV3Copy / home-content
 * in public-site). Each one is hidden on the site while it is empty. */
export const HOME_HERO_COPY = [
  {
    key: 'hero.cta.research',
    label: 'Research button label',
    short: 'Research button',
    hint: 'Primary hero button; opens the Research page.',
  },
  {
    key: 'hero.cta.cv',
    label: 'CV button label',
    short: 'CV button',
    hint: 'Secondary hero button; opens the CV page.',
  },
  {
    key: 'hero.cta.contact',
    label: 'Contact button label',
    short: 'Contact button',
    hint: 'Secondary hero button; opens the Contact page.',
  },
  {
    key: 'hero.focus_areas',
    label: 'Focus areas heading',
    short: 'Focus areas',
    hint: 'Heading above the research-topic chips.',
  },
] as const

/** Everything the public Home hero shows, in one place: the name, the role
 * line (localized tagline) and the managed-copy labels. The labels edit the
 * same entries as the managed-copy table; clearing one removes its key. */
export function HomeHeroFieldset({
  data,
  copyEntries,
  setCopyEntries,
}: {
  data: LocalizedSiteSettingsAdminOut
  copyEntries: CopyEntryDraft[]
  setCopyEntries: (next: CopyEntryDraft[]) => void
}) {
  const [brandName, setBrandName] = useState(data.brandName ?? '')
  const [tagline, setTagline] = useState(data.tagline ?? '')
  const valueOf = (key: string) =>
    copyEntries.find((entry) => entry.key === key)?.value ?? ''

  function setCopy(key: string, value: string) {
    const at = copyEntries.findIndex((entry) => entry.key === key)
    if (!value) {
      if (at >= 0) setCopyEntries(copyEntries.filter((_, i) => i !== at))
      return
    }
    if (at >= 0) {
      const next = [...copyEntries]
      next[at] = { key, value }
      setCopyEntries(next)
    } else {
      setCopyEntries([...copyEntries, { key, value }])
    }
  }

  const missing = [
    ...(brandName.trim() ? [] : ['Hero name']),
    ...(tagline.trim() ? [] : ['Role line']),
    ...HOME_HERO_COPY.filter((item) => !valueOf(item.key).trim()).map(
      (item) => item.short,
    ),
  ]

  return (
    <fieldset aria-labelledby="home-hero-title">
      <legend id="home-hero-title">Home hero</legend>
      <p className="muted admin-small">
        The public Home reads the published settings: save the draft, then
        publish localized settings.
      </p>
      {missing.length > 0 ? (
        <Notice tone="warning" title="Hidden on the public Home until set">
          {missing.join(' · ')}
        </Notice>
      ) : null}
      <div className="grid items-start gap-x-6 lg:grid-cols-2">
        <TextField
          id="locBrandName"
          label="Hero name (locale display name)"
          description="The large heading of the Home hero."
          value={brandName}
          onChange={setBrandName}
        />
        <TextField
          id="locTagline"
          label="Hero role line (localized tagline)"
          description="Shown under the name."
          value={tagline}
          onChange={setTagline}
        />
        {HOME_HERO_COPY.map((item) => (
          <div key={item.key}>
            <TextField
              id={`hero-copy-${item.key.replace(/\./g, '-')}`}
              label={item.label}
              description={item.hint}
              value={valueOf(item.key)}
              onChange={(value) => setCopy(item.key, value)}
            />
            <p className="muted admin-small -mt-3 mb-4">
              Managed copy key <code>{item.key}</code>
            </p>
          </div>
        ))}
      </div>
    </fieldset>
  )
}

export function ScenePresetsFieldset({
  data,
}: {
  data: LocalizedSiteSettingsAdminOut
}) {
  return (
    <fieldset>
      <legend>Scene presets (§I04)</legend>
      <div className="grid gap-x-6 lg:grid-cols-2">
        <SelectField
          id="graphPreset"
          label="Graph scene preset"
          defaultValue={data.scene?.graphPreset ?? 'atlas-v2'}
          options={[{ value: 'atlas-v2', label: 'Atlas V2 (atlas-v2)' }]}
        />
        <SelectField
          id="portalPreset"
          label="Portal preset"
          defaultValue={data.scene?.portalPreset ?? 'arch-v2'}
          options={[{ value: 'arch-v2', label: 'Arch V2 (arch-v2)' }]}
        />
        <SelectField
          id="motion"
          label="Procedural motion"
          defaultValue={data.scene?.motion ?? 'full'}
          options={[
            { value: 'full', label: 'Full motion' },
            { value: 'reduced', label: 'Reduced motion' },
            { value: 'off', label: 'Off' },
          ]}
        />
        <SelectField
          id="density"
          label="Visual density"
          defaultValue={data.scene?.density ?? 'standard'}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'low', label: 'Low' },
          ]}
        />
      </div>
    </fieldset>
  )
}

export function AudienceLinksFieldset({
  data,
}: {
  data: LocalizedSiteSettingsAdminOut
}) {
  return (
    <fieldset>
      <legend>Audience entry links (§I04)</legend>
      <div className="grid gap-x-6 lg:grid-cols-2">
        <TextField
          id="audResearchLabel"
          label="Research audience label"
          defaultValue={
            data.audienceLinks?.find((l) => l.kind === 'research')?.label ?? ''
          }
        />
        <TextField
          id="audResearchHref"
          label="Research audience destination URL"
          defaultValue={
            data.audienceLinks?.find((l) => l.kind === 'research')?.href ?? ''
          }
        />
        <TextField
          id="audEmploymentLabel"
          label="Employment audience label"
          defaultValue={
            data.audienceLinks?.find((l) => l.kind === 'employment')?.label ??
            ''
          }
        />
        <TextField
          id="audEmploymentHref"
          label="Employment audience destination URL"
          defaultValue={
            data.audienceLinks?.find((l) => l.kind === 'employment')?.href ?? ''
          }
        />
      </div>
    </fieldset>
  )
}

export function NavLinksFieldset({
  navLinks,
  setNavLinks,
}: {
  navLinks: NavLinkDraft[]
  setNavLinks: (next: NavLinkDraft[]) => void
}) {
  return (
    <fieldset>
      <legend>Navigation links (§I04)</legend>
      <p className="muted admin-small">
        Order and target paths for the primary header and footer navigation
        (maximum 20 links).
      </p>
      {navLinks.length === 0 ? (
        <EmptyState
          icon={LinkIcon}
          title="No navigation links defined."
          description="The public header and footer fall back to their defaults."
        />
      ) : (
        <div
          className="admin-table-scroll"
          role="region"
          aria-label="Navigation links"
          tabIndex={0}
        >
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Label</th>
                <th scope="col">Destination URL / Path</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {navLinks.map((link, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>
                    <input
                      type="text"
                      aria-label={`Navigation link ${idx + 1} label`}
                      value={link.label}
                      onChange={(e) => {
                        const next = [...navLinks]
                        next[idx] = {
                          ...next[idx],
                          label: e.target.value,
                        }
                        setNavLinks(next)
                      }}
                      className="admin-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      aria-label={`Navigation link ${idx + 1} destination`}
                      value={link.href}
                      onChange={(e) => {
                        const next = [...navLinks]
                        next[idx] = { ...next[idx], href: e.target.value }
                        setNavLinks(next)
                      }}
                      className="admin-input"
                    />
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="admin-actions admin-actions--tight">
                      <button
                        type="button"
                        className="admin-button admin-button--secondary"
                        disabled={idx === 0}
                        onClick={() => {
                          const next = [...navLinks]
                          const temp = next[idx - 1]
                          next[idx - 1] = next[idx]
                          next[idx] = temp
                          setNavLinks(next)
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button--secondary"
                        disabled={idx === navLinks.length - 1}
                        onClick={() => {
                          const next = [...navLinks]
                          const temp = next[idx + 1]
                          next[idx + 1] = next[idx]
                          next[idx] = temp
                          setNavLinks(next)
                        }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button--secondary"
                        onClick={() => {
                          setNavLinks(navLinks.filter((_, i) => i !== idx))
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {navLinks.length < 20 ? (
        <button
          type="button"
          className="admin-button admin-button--secondary mt-2"
          onClick={() => setNavLinks([...navLinks, { label: '', href: '' }])}
        >
          + Add navigation link
        </button>
      ) : null}
    </fieldset>
  )
}

export function CopyEntriesFieldset({
  copyEntries,
  setCopyEntries,
}: {
  copyEntries: CopyEntryDraft[]
  setCopyEntries: (next: CopyEntryDraft[]) => void
}) {
  return (
    <fieldset>
      <legend>Managed copy & UI text (§I04)</legend>
      <p className="muted admin-small">
        Editable interface strings, action labels, and section copy stored in
        CMS dictionary.
      </p>
      {copyEntries.length === 0 ? (
        <EmptyState
          icon={TypeIcon}
          title="No copy entries defined."
          description="Add a key and its text, or fill the Home hero fields above."
        />
      ) : (
        <div
          className="admin-table-scroll"
          role="region"
          aria-label="Content copy entries"
          tabIndex={0}
        >
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Text value</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {copyEntries.map((entry, idx) => (
                <tr key={idx}>
                  <td className="w-[35%]">
                    <input
                      type="text"
                      aria-label={`Copy entry ${idx + 1} key`}
                      placeholder="e.g. hero.cta.read"
                      value={entry.key}
                      onChange={(e) => {
                        const next = [...copyEntries]
                        next[idx] = { ...next[idx], key: e.target.value }
                        setCopyEntries(next)
                      }}
                      className="admin-input admin-mono"
                    />
                  </td>
                  <td>
                    <textarea
                      aria-label={`Copy entry ${idx + 1} value`}
                      rows={2}
                      value={entry.value}
                      onChange={(e) => {
                        const next = [...copyEntries]
                        next[idx] = {
                          ...next[idx],
                          value: e.target.value,
                        }
                        setCopyEntries(next)
                      }}
                      className="admin-input"
                    />
                  </td>
                  <td className="w-[10%]">
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      onClick={() => {
                        setCopyEntries(copyEntries.filter((_, i) => i !== idx))
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {copyEntries.length < 1500 ? (
        <button
          type="button"
          className="admin-button admin-button--secondary mt-2"
          onClick={() =>
            setCopyEntries([...copyEntries, { key: '', value: '' }])
          }
        >
          + Add copy entry
        </button>
      ) : null}
    </fieldset>
  )
}
