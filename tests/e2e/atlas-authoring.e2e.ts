/**
 * Plan B Task 17 authoring journey: versions → clone draft → edit node →
 * create relation → pin via drag → validate → publish → preview →
 * taxonomy — against the real UI with the admin API mocked at the network
 * boundary (the ADMIN-290 matrix precedent; server-side guard enforcement
 * is proven in the Back-End suite). Real keyboard and mouse drive every
 * step: arrows/Enter select graph nodes, Enter activates buttons, and a
 * pointer drag writes the pin.
 */
import { expect, test, type Page, type Request } from '@playwright/test'

interface StaffUser {
  id: number
  email: string
  displayName: string
  isStaff: boolean
  mfaEnrolled: boolean
  otpVerified: boolean
  featureFlags: Record<string, boolean>
}

const STAFF: StaffUser = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const REVISION_8 = '8-2026-09-21T00:00:00+00:00'

function nodeRow(publicKey: string, nodeTypeKey: string) {
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

interface DraftState {
  status: 'draft' | 'active'
  nodes: ReturnType<typeof nodeRow>[]
  relations: unknown[]
  pinPatches: unknown[]
  activateCalls: number
}

function json(status: number, body: unknown) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  }
}

/** Stateful draft behind the mocked boundary. */
function createState(): DraftState {
  return {
    status: 'draft',
    nodes: [
      nodeRow('project-2b3c4d5e', 'project'),
      nodeRow('method-11223344', 'method'),
    ],
    relations: [],
    pinPatches: [],
    activateCalls: 0,
  }
}

/** Mock every admin API call at the network boundary. */
function mockAtlas(page: Page, state: DraftState) {
  const detail = () => ({
    id: 8,
    label: 'Copy of Live',
    status: state.status,
    nodeCount: state.nodes.length,
    relationCount: state.relations.length,
    revision: REVISION_8,
    createdAt: '2026-09-21T00:00:00+00:00',
    updatedAt: '2026-09-21T00:00:00+00:00',
    publishedAt: state.status === 'draft' ? null : '2026-09-21T01:00:00+00:00',
  })
  const versions = () => [
    {
      id: 7,
      label: 'Live',
      status: 'active',
      nodeCount: 2,
      relationCount: 0,
      revision: '7-2026-09-10T00:00:00+00:00',
      createdAt: '2026-09-01T00:00:00+00:00',
      updatedAt: '2026-09-10T00:00:00+00:00',
    },
    detail(),
  ]
  void page.route('**/api/v1/admin/**', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()
    const body = () => {
      try {
        return JSON.parse(request.postData() ?? '{}') as Record<string, unknown>
      } catch {
        return {}
      }
    }
    if (path.endsWith('/auth/me')) return route.fulfill(json(200, STAFF))
    if (path.endsWith('/auth/csrf'))
      return route.fulfill(json(200, { csrfToken: 'e2e-csrf' }))
    if (path.endsWith('/atlas/versions') && method === 'GET')
      return route.fulfill(json(200, versions()))
    if (path.endsWith('/atlas/versions/7/clone') && method === 'POST')
      return route.fulfill(json(201, detail()))
    if (path.endsWith('/atlas/versions/8') && method === 'GET')
      return route.fulfill(json(200, detail()))
    if (path.endsWith('/atlas/versions/8/nodes') && method === 'GET')
      return route.fulfill(json(200, state.nodes))
    if (path.endsWith('/atlas/versions/8/relations') && method === 'GET')
      return route.fulfill(json(200, state.relations))
    if (path.endsWith('/atlas/versions/8/groups') && method === 'GET')
      return route.fulfill(json(200, []))
    if (path.endsWith('/atlas/versions/8/validate'))
      return route.fulfill(json(200, { blocking: [], warnings: [] }))
    if (path.endsWith('/atlas/node-types'))
      return route.fulfill(
        json(200, [
          {
            key: 'project',
            label_en: 'Project',
            label_fa: 'پروژه',
            active: true,
            sort_order: 0,
            defaultImportance: 50,
            canonicalSource: 'none',
          },
        ]),
      )
    if (path.endsWith('/atlas/relation-types'))
      return route.fulfill(
        json(200, [
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
        ]),
      )
    const nodePatch = path.match(/\/atlas\/versions\/8\/nodes\/(.+)$/)
    if (nodePatch && method === 'PATCH') {
      const payload = body()
      const pin = payload['pin']
      if (pin !== undefined && pin !== null && typeof pin === 'object') {
        state.pinPatches.push(pin)
      }
      const row = state.nodes.find(
        (candidate) => candidate.publicKey === decodeURIComponent(nodePatch[1]),
      )
      if (typeof payload['importance'] === 'number' && row) {
        row.importance = payload['importance'] as number
      }
      return route.fulfill(json(200, row ?? state.nodes[0]))
    }
    if (path.endsWith('/atlas/versions/8/relations') && method === 'POST') {
      const payload = body()
      const row = {
        key: `${payload['sourceKey']}~${payload['relationTypeKey']}~${payload['targetKey']}`,
        directed: true,
        visible: true,
        weight: 0,
        ...payload,
      }
      state.relations.push(row)
      return route.fulfill(json(201, row))
    }
    if (path.endsWith('/atlas/versions/8/activate') && method === 'POST') {
      state.activateCalls += 1
      state.status = 'active'
      return route.fulfill(
        json(200, {
          id: 8,
          status: 'active',
          publishedAt: '2026-09-21T01:00:00+00:00',
          enqueuedPublicationJob: 42,
        }),
      )
    }
    if (path.endsWith('/atlas/versions/8/preview-token') && method === 'POST') {
      const locale = (body()['locale'] as string | undefined) ?? 'en'
      return route.fulfill(
        json(200, {
          preview_url: `/${locale}/atlas/preview/#token=e2e-capability`,
          expires_at: 1788243600,
          version_id: 8,
        }),
      )
    }
    return route.fulfill(json(500, { code: 'STUB', message: path }))
  })
}

test('Atlas authoring journey: clone, edit, relate, pin, validate, publish', async ({
  page,
}) => {
  const state = createState()
  const requests: Request[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/admin/atlas/')) {
      requests.push(request)
    }
  })
  mockAtlas(page, state)

  // Versions → clone a draft (navigates to the new editor on success).
  await page.goto('/admin/atlas')
  await expect(
    page.getByRole('heading', { name: 'Atlas versions' }),
  ).toBeVisible()
  await page
    .getByText('Live', { exact: true })
    .locator('..')
    .getByRole('button', { name: /clone/i })
    .click()
  await expect(page).toHaveURL(/\/admin\/atlas\/8$/)
  await expect(
    page.getByRole('heading', { name: 'Atlas editor' }),
  ).toBeVisible()

  // Graph selection with the keyboard: focus a node, arrow to its
  // neighbour, Enter selects it into the node form. (The graphics ARIA
  // roles are unit-pinned in jsdom; in a real browser the same elements
  // surface as generic/img, so e2e addresses the stable data-key.)
  const project = page.locator('[data-key="project-2b3c4d5e"]')
  await project.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#atlas-editor-node')).toHaveValue(
    'method-11223344',
  )
  await page.keyboard.press('Enter')
  await expect(page.getByRole('form', { name: 'Edit node' })).toBeVisible()

  // Edit importance and save with Enter on the focused button. Enter
  // selects the focused node, so the PATCH targets project-2b3c4d5e.
  await page.getByLabel('Importance').fill('70')
  await page.getByRole('button', { name: 'Save node' }).focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.url().endsWith('/atlas/versions/8/nodes/project-2b3c4d5e') &&
          request.method() === 'PATCH',
      ),
    )
    .toBe(true)

  // Create a relation through the structured form.
  await page
    .getByLabel('Source', { exact: true })
    .selectOption('project-2b3c4d5e')
  await page.getByLabel('Relation Type', { exact: true }).selectOption('uses')
  await page
    .getByLabel('Target', { exact: true })
    .selectOption('method-11223344')
  await page.getByRole('button', { name: 'Create relation' }).click()
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.url().endsWith('/atlas/versions/8/relations') &&
          request.method() === 'POST',
      ),
    )
    .toBe(true)

  // Pin with a real pointer drag; selection clicks must not pin.
  // The graph sits below the fold: scrolling first puts the node into
  // the viewport, otherwise the pointer lands outside the window.
  await project.scrollIntoViewIfNeeded()
  const box = await project.boundingBox()
  expect(box).not.toBeNull()
  const cx = box!.x + box!.width / 2
  const cy = box!.y + box!.height / 2
  const pinsBefore = state.pinPatches.length
  const nodeUrl = '/atlas/versions/8/nodes/project-2b3c4d5e'
  const pinRequests = () =>
    requests.filter(
      (request) =>
        request.url().endsWith(nodeUrl) && request.method() === 'PATCH',
    )
  // A plain selection click must not pin (Task-14 click boundary).
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(300)
  expect(state.pinPatches.length).toBe(pinsBefore)
  // Real drag: down, move well past the click threshold, up.
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 40, cy - 10, { steps: 5 })
  await page.mouse.up()
  await expect.poll(() => state.pinPatches.length).toBe(pinsBefore + 1)
  const pin = state.pinPatches[state.pinPatches.length - 1] as {
    x: number
    y: number
  }
  expect(Number.isFinite(pin.x)).toBe(true)
  expect(Number.isFinite(pin.y)).toBe(true)
  const dragPatch = pinRequests()[pinRequests().length - 1]
  const dragBody = JSON.parse(dragPatch.postData() ?? '{}') as Record<
    string,
    unknown
  >
  expect(dragBody['pin']).toEqual(pin)
  // UI settles: the node still renders, no pin failure is shown.
  await expect(page.locator('[data-key="project-2b3c4d5e"]')).toBeVisible()
  expect(page.getByText('Failed to save the pin')).not.toBeVisible()

  // Validation gates publish; a clean draft publishes.
  await expect(page.getByText(/No validation issues/)).toBeVisible()
  await page.getByRole('button', { name: 'Publish' }).click()
  await page.getByRole('button', { name: 'Confirm publish' }).click()
  await expect(page.getByText('This version is published')).toBeVisible()
  await expect(page.getByText(/Publication job 42/)).toBeVisible()
  expect(state.activateCalls).toBe(1)

  // Preview frames the minted capability; taxonomy lists the types.
  await page.goto('/admin/atlas/8/preview')
  const frame = page.getByTitle('Atlas 3D preview')
  await expect(frame).toBeVisible()
  expect(await frame.getAttribute('src')).toContain('#token=')
  await page.goto('/admin/atlas/taxonomy')
  await expect(
    page.getByRole('heading', { name: 'Atlas taxonomy' }),
  ).toBeVisible()
  await expect(page.getByText('Project', { exact: true })).toBeVisible()
})
