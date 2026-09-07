import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { CompositionSectionUpdateIn } from '@/lib/api/composition'
import { STORY_BLOCK_TYPES, StoryEditor } from '@/components/editor/StoryEditor'

const PAGE = {
  id: 11,
  key: 'story-en-1',
  kind: 'story',
  locale: 'en',
  title: 'Test story',
  status: 'draft',
  publishedAt: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  sections: [],
}

const SCHEMA = {
  kind: 'story',
  blockTypes: [
    {
      type: 'text',
      labelFa: 'متن',
      required: ['markdown'],
      fields: [
        { key: 'markdown', label: 'Markdown', type: 'textarea' },
        {
          key: 'align',
          label: 'Align',
          type: 'text',
          options: ['left', 'center'],
        },
      ],
    },
    {
      type: 'code',
      labelFa: 'کد',
      required: ['code'],
      fields: [
        { key: 'code', label: 'Code', type: 'textarea' },
        { key: 'language', label: 'Language', type: 'text' },
      ],
    },
  ],
  sectionLayouts: [{ value: '1col', label: 'One column', ratios: [] }],
}

const SECTIONS: CompositionSectionUpdateIn[] = [
  {
    layout: '1col',
    ratio: '',
    enabled: true,
    blocks: [
      { blockType: 'text', enabled: true, settings: { markdown: 'Hello' } },
      { blockType: 'code', enabled: true, settings: { code: 'x = 1' } },
    ],
  },
]

function Harness({
  schema = SCHEMA,
  saveState = 'idle',
  autosaveState = 'dirty',
  dir = 'ltr',
  onSave = vi.fn(),
  onResolveConflict = vi.fn(),
}: {
  schema?: typeof SCHEMA | null
  saveState?: 'idle' | 'saving' | 'saved' | 'conflict' | 'error'
  autosaveState?: 'idle' | 'dirty' | 'saving' | 'saved'
  dir?: 'ltr' | 'rtl'
  onSave?: () => void
  onResolveConflict?: (choice: 'mine' | 'theirs') => void
}) {
  const [sections, setSections] = useState(SECTIONS)
  return (
    <StoryEditor
      page={PAGE}
      schema={schema}
      sections={sections}
      onChange={setSections}
      onSave={onSave}
      saveState={saveState}
      autosaveState={autosaveState}
      conflictDetail="Updated at 2026-09-03 by another editor."
      serverError={saveState === 'error' ? 'Saving failed. Try again.' : null}
      onResolveConflict={onResolveConflict}
      dir={dir}
    />
  )
}

describe('story editor (PU-09-editor)', () => {
  it('fails before the editor exists against the story contract', () => {
    // The story catalog is backend-owned; the editor must offer its types.
    expect(STORY_BLOCK_TYPES).toContain('code')
    expect(STORY_BLOCK_TYPES).toContain('table')
    expect(STORY_BLOCK_TYPES).toContain('file')
    expect(STORY_BLOCK_TYPES).toContain('related')
  })

  it('renders schema-driven block forms with required markers', () => {
    render(<Harness />)
    expect(screen.getByRole('heading', { name: /story blocks/i })).toBeDefined()
    expect(screen.getByLabelText(/markdown \(required\)/i)).toHaveProperty(
      'value',
      'Hello',
    )
    expect(screen.getByLabelText(/code \(required\)/i)).toHaveProperty(
      'value',
      'x = 1',
    )
  })

  it('reorders blocks with accessible controls', () => {
    render(<Harness />)
    const first = screen.getByRole('article', {
      name: /block 1: text/i,
    })
    expect(first).toBeDefined()
    fireEvent.click(
      screen.getByRole('button', { name: /move block 1 down in section 1/i }),
    )
    expect(
      screen.getByRole('article', { name: /block 1: code/i }),
    ).toBeDefined()
    expect(
      screen.getByRole('article', { name: /block 2: text/i }),
    ).toBeDefined()
  })

  it('shows visible autosave, saved, conflict, and error states', () => {
    const onResolveConflict = vi.fn()
    const { rerender } = render(
      <Harness autosaveState="dirty" onResolveConflict={onResolveConflict} />,
    )
    expect(screen.getByRole('status').textContent).toMatch(/unsaved changes/i)

    rerender(
      <Harness
        autosaveState="saved"
        saveState="saved"
        onResolveConflict={onResolveConflict}
      />,
    )
    expect(screen.getByRole('status').textContent).toMatch(/saved/i)

    rerender(
      <Harness saveState="conflict" onResolveConflict={onResolveConflict} />,
    )
    expect(screen.getByRole('alert').textContent).toMatch(/changed elsewhere/i)
    fireEvent.click(screen.getByRole('button', { name: /reload latest/i }))
    expect(onResolveConflict).toHaveBeenCalledWith('theirs')

    rerender(<Harness saveState="error" />)
    expect(screen.getByRole('alert').textContent).toMatch(/saving failed/i)
  })

  it('saves via keyboard-operable controls and honors RTL', () => {
    const onSave = vi.fn()
    render(<Harness dir="rtl" onSave={onSave} />)
    const save = screen.getByRole('button', { name: /save story/i })
    expect(save.closest('section')?.getAttribute('dir')).toBe('rtl')
    save.focus()
    expect(document.activeElement).toBe(save)
    fireEvent.click(save)
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('falls back to the story catalog when the schema is unavailable', () => {
    render(<Harness schema={null} />)
    expect(screen.getByRole('note').textContent).toMatch(/schema unavailable/i)
    fireEvent.change(screen.getByLabelText(/add block to section 1/i), {
      target: { value: 'table' },
    })
    expect(
      screen.getByRole('article', { name: /block 3: table/i }),
    ).toBeDefined()
  })
})
