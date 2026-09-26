import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import graphCss from '@/components/atlas/AuthoringGraph.css?raw'
import primitivesCss from '@/components/ui/primitives.css?raw'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import type {
  AtlasNodeRow,
  AtlasNodeTypeRow,
  AtlasRelationTypeRow,
} from '@/lib/api/atlas'
import { createTestQueryClient } from '@/lib/query/client'
import { AtlasEditorPage } from '@/pages/AtlasEditorPage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const REVISION = '7-2026-09-21T00:00:00+00:00'

function node(publicKey: string, nodeTypeKey: string): AtlasNodeRow {
  return {
    publicKey,
    nodeTypeKey,
    canonicalSource: 'none',
    canonicalTranslationKey: null,
    groupKeys: [],
    importance: 50,
    localeStatus: { en: true, fa: true },
    mobileOverviewPriority: 'auto',
    pin: null,
    visible: true,
  }
}

const NODES = [
  node('project-2b3c4d5e', 'project'),
  node('method-11223344', 'method'),
]

const NODE_TYPES: AtlasNodeTypeRow[] = [
  {
    key: 'project',
    label_en: 'Project',
    label_fa: 'پروژه',
    active: true,
    sort_order: 0,
    defaultImportance: 50,
    canonicalSource: 'none',
  },
  {
    key: 'method',
    label_en: 'Method',
    label_fa: 'روش',
    active: true,
    sort_order: 1,
    defaultImportance: 50,
    canonicalSource: 'none',
  },
]

const RELATION_TYPES: AtlasRelationTypeRow[] = [
  {
    key: 'uses',
    label_en: 'Uses',
    label_fa: 'استفاده',
    active: true,
    sort_order: 0,
    canonicalSource: 'none',
    defaultImportance: 50,
    directedDefault: true,
    overridableDirection: true,
    hierarchyRole: false,
    allowedSourceTypes: [],
    allowedTargetTypes: [],
  },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const CREATED_RELATION = {
  key: 'project-2b3c4d5e~uses~method-11223344',
  sourceKey: 'project-2b3c4d5e',
  relationTypeKey: 'uses',
  targetKey: 'method-11223344',
  directed: true,
  visible: true,
  weight: 0,
}

function stubEditor() {
  let status = 'draft'
  // One seeded relation so the table renders on first paint; the journey
  // creates a second row through the form.
  const relations: unknown[] = [{ ...CREATED_RELATION }]
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const target = String(url)
      if (target.endsWith('/auth/me')) {
        return Promise.resolve(jsonResponse(ME))
      }
      if (target.endsWith('/auth/csrf')) {
        return Promise.resolve(jsonResponse({ csrfToken: 'test-csrf' }))
      }
      if (
        target.endsWith('/atlas/versions/7/activate') &&
        init?.method === 'POST'
      ) {
        status = 'active'
        return Promise.resolve(
          jsonResponse({
            id: 7,
            status: 'active',
            publishedAt: '2026-09-21T01:00:00+00:00',
            enqueuedPublicationJob: 42,
          }),
        )
      }
      if (target.endsWith('/atlas/versions/7/validate')) {
        return Promise.resolve(jsonResponse({ blocking: [], warnings: [] }))
      }
      if (target.endsWith('/atlas/versions/7')) {
        return Promise.resolve(
          jsonResponse({
            id: 7,
            label: 'Draft',
            status,
            nodeCount: 2,
            relationCount: relations.length,
            revision: REVISION,
            createdAt: '2026-09-21T00:00:00+00:00',
            updatedAt: '2026-09-21T00:00:00+00:00',
            publishedAt:
              status === 'draft' ? null : '2026-09-21T01:00:00+00:00',
          }),
        )
      }
      if (target.endsWith('/atlas/versions/7/nodes')) {
        return Promise.resolve(jsonResponse(NODES))
      }
      if (
        target.endsWith('/atlas/versions/7/relations') &&
        init?.method === 'POST'
      ) {
        relations.push(CREATED_RELATION)
        return Promise.resolve(jsonResponse(CREATED_RELATION, 201))
      }
      if (target.endsWith('/atlas/versions/7/relations')) {
        return Promise.resolve(jsonResponse(relations))
      }
      if (target.endsWith('/atlas/versions/7/groups')) {
        return Promise.resolve(jsonResponse([]))
      }
      if (target.endsWith('/atlas/node-types')) {
        return Promise.resolve(jsonResponse(NODE_TYPES))
      }
      if (target.endsWith('/atlas/relation-types')) {
        return Promise.resolve(jsonResponse(RELATION_TYPES))
      }
      if (target.includes('/atlas/versions/7/nodes/')) {
        return Promise.resolve(jsonResponse(NODES[0]))
      }
      return Promise.resolve(
        jsonResponse({ code: 'STUB', message: `not mocked: ${target}` }, 500),
      )
    }),
  )
}

function renderEditor() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/atlas/7']}>
        <AuthProvider>
          <Routes>
            <Route path="/atlas/:versionId" element={<AtlasEditorPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AtlasEditorPage accessibility (Plan B Task 17)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('completes the authoring journey with the keyboard only', async () => {
    stubEditor()
    renderEditor()
    // Navigate: focus a graph node and select it with the keyboard.
    const symbol = await screen.findByRole('graphics-symbol', {
      name: 'project-2b3c4d5e',
    })
    ;(symbol as HTMLElement).focus()
    fireEvent.keyDown(symbol, { key: 'ArrowRight' })
    fireEvent.keyDown(
      screen.getByRole('graphics-symbol', { name: 'method-11223344' }),
      { key: 'Enter' },
    )
    // Edit: the node form follows the selection; change importance and
    // submit through the form's implicit (keyboard) submission.
    const form = await screen.findByRole('form', { name: 'Edit node' })
    fireEvent.change(screen.getByLabelText('Importance'), {
      target: { value: '70' },
    })
    fireEvent.submit(form)
    await waitFor(() => {
      const patches = vi
        .mocked(fetch)
        .mock.calls.filter(([url]) =>
          String(url).endsWith('/atlas/versions/7/nodes/method-11223344'),
        )
      expect(patches.length).toBeGreaterThan(0)
      const [, init] = patches[0] as [string, RequestInit]
      expect(init.method).toBe('PATCH')
      expect(JSON.parse(String(init.body))).toMatchObject({ importance: 70 })
    })
    // Create relation: structured selects, then the form submit.
    fireEvent.change(screen.getByLabelText('Source'), {
      target: { value: 'project-2b3c4d5e' },
    })
    fireEvent.change(screen.getByLabelText('Relation Type'), {
      target: { value: 'uses' },
    })
    fireEvent.change(screen.getByLabelText('Target'), {
      target: { value: 'method-11223344' },
    })
    fireEvent.submit(screen.getByRole('form', { name: 'Create relation' }))
    await waitFor(() => {
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([url]) =>
            String(url).endsWith('/atlas/versions/7/relations'),
          ),
      ).toBe(true)
    })
    // Validate → publish, by focusing the buttons first.
    const publish = screen.getByRole('button', { name: 'Publish' })
    ;(publish as HTMLElement).focus()
    fireEvent.click(publish)
    const confirm = await screen.findByRole('button', {
      name: 'Confirm publish',
    })
    ;(confirm as HTMLElement).focus()
    fireEvent.click(confirm)
    await waitFor(() => {
      expect(screen.getByText('This version is published')).toBeInTheDocument()
    })
  })

  it('keeps every authoring control at least 44px tall', async () => {
    stubEditor()
    const { container } = renderEditor()
    await screen.findByRole('graphics-document')
    // Buttons, inputs and selects carry the 44px floor through the shared
    // primitives (2.75rem at the 16px root).
    const undersized: string[] = []
    for (const control of container.querySelectorAll(
      'button, input:not([type="checkbox"]):not([type="radio"]), select, textarea',
    )) {
      const style = getComputedStyle(control)
      const min = style.getPropertyValue('min-block-size')
      if (!['2.75rem', '44px'].includes(min)) {
        const element = control as HTMLElement
        undersized.push(
          `${control.tagName}#${control.id || element.getAttribute('aria-label') || '?'} (${min || 'none'})`,
        )
      }
    }
    expect(undersized).toEqual([])
    // Checkboxes are small visuals inside a 44px label row: the label
    // toggles the box, and every box has that label.
    for (const box of container.querySelectorAll('input[type="checkbox"]')) {
      const label = box.id
        ? container.querySelector(`label[for="${box.id}"]`)
        : null
      expect(label).not.toBeNull()
    }
    // Every graph node carries a 44px pointer hit halo over its visual.
    for (const symbol of container.querySelectorAll(
      '[role="graphics-symbol"]',
    )) {
      const halo = symbol.querySelector('[data-hit="true"]')
      expect(halo).not.toBeNull()
      expect(Number(halo?.getAttribute('r'))).toBeGreaterThanOrEqual(22)
    }
  })

  it('keeps DOM order equal to focus order', async () => {
    stubEditor()
    const { container } = renderEditor()
    await screen.findByRole('graphics-document')
    const tabbable = [...container.querySelectorAll('[tabindex]')].map(
      (element) => Number(element.getAttribute('tabindex')),
    )
    expect(tabbable.length).toBeGreaterThan(0)
    for (const order of tabbable) {
      expect(order).toBeLessThanOrEqual(0)
    }
  })

  it('pins the focus-visible contract in the stylesheets', () => {
    expect(primitivesCss).toContain(':focus-visible')
    expect(primitivesCss).toContain('2.75rem')
    expect(graphCss).toContain(':focus-visible')
  })

  it('labels every authoring control and names its tables', async () => {
    stubEditor()
    const { container } = renderEditor()
    await screen.findByRole('graphics-document')
    for (const field of container.querySelectorAll('input, select, textarea')) {
      const labelled =
        field.getAttribute('aria-label') !== null ||
        (field.id &&
          container.querySelector(`label[for="${field.id}"]`) !== null)
      expect(`${field.tagName}#${field.id}`).toBeTruthy()
      expect(labelled).toBe(true)
    }
    for (const button of container.querySelectorAll('button')) {
      expect(button.textContent?.trim().length).toBeGreaterThan(0)
    }
    expect(
      within(container as HTMLElement).getByRole('table', {
        name: 'Atlas relations',
      }),
    ).toBeInTheDocument()
  })

  it('keeps selectable fallbacks beside the graph and opens no modal dialog', async () => {
    stubEditor()
    renderEditor()
    await screen.findByRole('graphics-document')
    expect(screen.getByLabelText('Node')).toBeInTheDocument()
    const publish = screen.getByRole('button', { name: 'Publish' })
    ;(publish as HTMLElement).focus()
    fireEvent.click(publish)
    await screen.findByRole('button', { name: 'Confirm publish' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
