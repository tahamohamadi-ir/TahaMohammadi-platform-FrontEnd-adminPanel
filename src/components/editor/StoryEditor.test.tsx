import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { CompositionSectionUpdateIn } from '@/lib/api/composition'
import { STORY_BLOCK_TYPES, StoryEditor } from '@/components/editor/StoryEditor'
import { fetchMediaList, fetchMediaItem } from '@/lib/api/media'
import { listContent, fetchContentDetail } from '@/lib/api/content'
import { validateStoryDraft } from '@/components/editor/story-validation'
import { StoryLibraryField } from '@/components/editor/story-library-fields'

vi.mock('@/lib/api/media', () => ({
  fetchMediaList: vi.fn(),
  fetchMediaItem: vi.fn(),
}))
vi.mock('@/lib/api/content', () => ({
  listContent: vi.fn(),
  fetchContentDetail: vi.fn(),
}))

vi.mocked(fetchMediaList).mockResolvedValue({
  items: [{ id: 30, title: 'Test image', mime: 'image/png' }],
} as Awaited<ReturnType<typeof fetchMediaList>>)
vi.mocked(fetchMediaItem).mockImplementation(
  async (id) =>
    ({ id, title: `Image ${id}`, mime: 'image/png' }) as Awaited<
      ReturnType<typeof fetchMediaItem>
    >,
)
vi.mocked(listContent).mockResolvedValue({
  items: [{ id: 43, title: 'Test article', status: 'draft' }],
} as Awaited<ReturnType<typeof listContent>>)
vi.mocked(fetchContentDetail).mockImplementation(
  async (_entity, id) =>
    ({ id, title: `Article ${id}`, status: 'draft' }) as Awaited<
      ReturnType<typeof fetchContentDetail>
    >,
)

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

  it('chooses actual media and records and edits table cells without raw IDs or JSON', async () => {
    let capturedSections: CompositionSectionUpdateIn[] = []
    const structuredSchema = {
      kind: 'story',
      blockTypes: [
        {
          type: 'table',
          labelFa: 'جدول',
          required: ['columns'],
          fields: [
            { key: 'columns', label: 'Columns', type: 'columnList' },
            { key: 'rows', label: 'Rows', type: 'rowList' },
          ],
        },
        {
          type: 'gallery',
          labelFa: 'گالری',
          required: ['mediaIds'],
          fields: [{ key: 'mediaIds', label: 'Media IDs', type: 'mediaList' }],
        },
        {
          type: 'references',
          labelFa: 'مراجع',
          required: ['items'],
          fields: [{ key: 'items', label: 'Items', type: 'referenceList' }],
        },
        {
          type: 'related',
          labelFa: 'موارد مرتبط',
          required: ['records'],
          fields: [{ key: 'records', label: 'Records', type: 'relatedList' }],
        },
      ],
      sectionLayouts: [{ value: '1col', label: 'One column', ratios: [] }],
    }

    const structuredSections: CompositionSectionUpdateIn[] = [
      {
        layout: '1col',
        ratio: '',
        enabled: true,
        blocks: [
          {
            blockType: 'gallery',
            enabled: true,
            settings: { mediaIds: [10, 20] },
          },
          {
            blockType: 'table',
            enabled: true,
            settings: {
              columns: [{ key: 'col1', label: 'Col 1' }],
              rows: [{ col1: 'val1' }],
            },
          },
          {
            blockType: 'references',
            enabled: true,
            settings: {
              items: [{ label: 'Ref A', url: 'https://example.com' }],
            },
          },
          {
            blockType: 'related',
            enabled: true,
            settings: {
              records: [{ family: 'article', id: '42' }],
            },
          },
        ],
      },
    ]

    function StructuredHarness() {
      const [sections, setSections] = useState(structuredSections)
      capturedSections = sections
      return (
        <StoryEditor
          page={PAGE}
          schema={structuredSchema}
          sections={sections}
          onChange={setSections}
          onSave={vi.fn()}
          saveState="idle"
          autosaveState="idle"
          onResolveConflict={vi.fn()}
        />
      )
    }

    render(<StructuredHarness />)

    fireEvent.click(
      await screen.findByRole('button', { name: /choose test image/i }),
    )

    // Check captured sections preserves number[] array
    const galleryBlock = capturedSections[0]?.blocks?.[0]
    expect(Array.isArray(galleryBlock?.settings?.mediaIds)).toBe(true)
    expect(galleryBlock?.settings?.mediaIds).toEqual([10, 20, 30])

    // Check columnList input has column inputs, not raw [object Object]
    expect(screen.queryByDisplayValue('col1')).toBeNull()
    expect(screen.getByDisplayValue('Col 1')).toBeDefined()
    expect(screen.queryByDisplayValue('[object Object]')).toBeNull()
    fireEvent.change(screen.getByLabelText('Row 1, Col 1'), {
      target: { value: 'Edited cell' },
    })
    expect(capturedSections[0]?.blocks?.[1]?.settings?.rows).toEqual([
      { col1: 'Edited cell' },
    ])

    // Add column
    fireEvent.click(screen.getByRole('button', { name: /\+ add column/i }))
    const tableBlock = capturedSections[0]?.blocks?.[1]
    expect(Array.isArray(tableBlock?.settings?.columns)).toBe(true)
    expect((tableBlock?.settings?.columns as unknown[]).length).toBe(2)

    // Add reference
    fireEvent.click(screen.getByRole('button', { name: /\+ add reference/i }))
    const refBlock = capturedSections[0]?.blocks?.[2]
    expect(Array.isArray(refBlock?.settings?.items)).toBe(true)
    expect((refBlock?.settings?.items as unknown[]).length).toBe(2)

    // Add related record
    fireEvent.click(
      await screen.findByRole('button', { name: /choose test article/i }),
    )
    const relBlock = capturedSections[0]?.blocks?.[3]
    expect(Array.isArray(relBlock?.settings?.records)).toBe(true)
    expect((relBlock?.settings?.records as unknown[]).length).toBe(2)
    expect(relBlock?.settings?.records).toEqual([
      { family: 'article', id: '42' },
      { family: 'article', id: '43' },
    ])
    expect(screen.queryByPlaceholderText('Record ID')).toBeNull()
  })

  it('blocks saving incomplete required values and allows saving after correction', () => {
    const onSave = vi.fn()
    render(<Harness onSave={onSave} />)
    fireEvent.change(screen.getByLabelText(/markdown \(required\)/i), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save story/i }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(/markdown/i)
    fireEvent.change(screen.getByLabelText(/markdown \(required\)/i), {
      target: { value: 'Corrected' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save story/i }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('validates schema item limits, nested required values, duplicate columns and unknown row keys', () => {
    const schema = {
      ...SCHEMA,
      blockTypes: [
        {
          type: 'table',
          labelFa: 'Table',
          required: ['columns', 'rows'],
          fields: [
            { key: 'columns', label: 'Columns', type: 'columnList' },
            { key: 'rows', label: 'Rows', type: 'rowList' },
          ],
        },
        {
          type: 'tabs',
          labelFa: 'Tabs',
          required: ['items'],
          fields: [
            {
              key: 'items',
              label: 'Items',
              type: 'itemList',
              minItems: 2,
              itemFields: [{ key: 'label', required: true }],
            },
          ],
        },
      ],
    }
    expect(
      validateStoryDraft(
        [
          {
            blocks: [
              {
                blockType: 'table',
                settings: { columns: [{ key: 'a', label: 'A' }], rows: [] },
              },
            ],
          },
        ],
        schema,
      ),
    ).toEqual([])
    const issues = validateStoryDraft(
      [
        {
          blocks: [
            {
              blockType: 'table',
              settings: {
                columns: [
                  { key: 'a', label: '' },
                  { key: 'a', label: 'A' },
                ],
                rows: [{ unknown: 'x' }],
              },
            },
            { blockType: 'tabs', settings: { items: [{ label: '' }] } },
          ],
        },
      ],
      schema,
    )
    expect(issues.join(' ')).toMatch(/duplicate/i)
    expect(issues.join(' ')).toMatch(/unknown column/i)
    expect(issues.join(' ')).toMatch(/at least 2/i)
    expect(issues.join(' ')).toMatch(/label/i)
  })

  it('replaces visible table cells and media selections on external reload', async () => {
    const schema = {
      ...SCHEMA,
      blockTypes: [
        {
          type: 'table',
          labelFa: 'Table',
          required: ['columns', 'rows'],
          fields: [
            { key: 'columns', label: 'Columns', type: 'columnList' },
            { key: 'rows', label: 'Rows', type: 'rowList' },
          ],
        },
        {
          type: 'gallery',
          labelFa: 'Gallery',
          required: ['mediaIds'],
          fields: [{ key: 'mediaIds', label: 'Images', type: 'mediaList' }],
        },
      ],
    }
    const makeSections = (cell: string, mediaId: number) => [
      {
        enabled: true,
        layout: '1col',
        ratio: '',
        blocks: [
          {
            blockType: 'table',
            enabled: true,
            settings: {
              columns: [{ key: 'a', label: 'Title' }],
              rows: [{ a: cell }],
            },
          },
          {
            blockType: 'gallery',
            enabled: true,
            settings: { mediaIds: [mediaId] },
          },
        ],
      },
    ]
    const props = {
      page: PAGE,
      schema,
      onChange: vi.fn(),
      onSave: vi.fn(),
      saveState: 'idle' as const,
      autosaveState: 'idle' as const,
      onResolveConflict: vi.fn(),
    }
    const { rerender } = render(
      <StoryEditor {...props} sections={makeSections('Local', 10)} />,
    )
    expect(screen.getByLabelText('Row 1, Title')).toHaveProperty(
      'value',
      'Local',
    )
    await screen.findByText('Image 10')
    rerender(<StoryEditor {...props} sections={makeSections('Server', 20)} />)
    expect(screen.getByLabelText('Row 1, Title')).toHaveProperty(
      'value',
      'Server',
    )
    await screen.findByText('Image 20')
    expect(screen.queryByText('Image 10')).toBeNull()
  })

  it('searches real content families in the story locale and preserves numeric download selection', async () => {
    const onChange = vi.fn()
    render(
      <StoryLibraryField
        inputId="download-picker"
        kind="download"
        locale="fa"
        value={null}
        onChange={onChange}
      />,
    )
    fireEvent.click(
      await screen.findByRole('button', { name: /choose test article/i }),
    )
    expect(listContent).toHaveBeenCalledWith(
      'download',
      expect.objectContaining({ locale: 'fa', page: 1 }),
    )
    expect(onChange).toHaveBeenCalledWith(43)
    fireEvent.change(screen.getByLabelText('Search content'), {
      target: { value: 'report' },
    })
    await waitFor(() =>
      expect(listContent).toHaveBeenCalledWith(
        'download',
        expect.objectContaining({ locale: 'fa', q: 'report', page: 1 }),
      ),
    )
  })

  it('paginates media and preserves selections during library failure', async () => {
    vi.mocked(fetchMediaList).mockResolvedValueOnce({
      items: [],
      total: 21,
    } as Awaited<ReturnType<typeof fetchMediaList>>)
    vi.mocked(fetchMediaList).mockRejectedValueOnce(new Error('offline'))
    const onChange = vi.fn()
    render(
      <StoryLibraryField
        inputId="images"
        kind="mediaList"
        locale="en"
        mediaType="image"
        value={[10]}
        onChange={onChange}
      />,
    )
    const next = await screen.findByRole('button', { name: 'Next results' })
    fireEvent.click(next)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your selections are preserved',
    )
    expect(fetchMediaList).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, type: 'image', active: 'true' }),
    )
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText('Image 10')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry library' }))
    expect(
      await screen.findByRole('button', { name: /choose test image/i }),
    ).toBeInTheDocument()
  })
})
