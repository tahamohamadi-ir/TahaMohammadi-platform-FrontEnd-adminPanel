import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AtlasValidationOut } from '@/lib/api/atlas'
import { ValidationPanel } from '@/components/atlas/ValidationPanel'

const PARITY_FA = {
  blocking: [
    {
      code: 'MISSING_LOCALE_PROJECTION',
      nodeKey: 'research-area-1a2b3c4d',
      messageToken: 'parity.missing.fa',
    },
  ],
  warnings: [],
}

function renderPanel(issues: AtlasValidationOut) {
  const onGoTo = vi.fn()
  const onPublish = vi.fn()
  render(
    <ValidationPanel issues={issues} onGoTo={onGoTo} onPublish={onPublish} />,
  )
  return { onGoTo, onPublish }
}

describe('ValidationPanel (Plan B Task 15)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('blocks publish on a locale-parity blocker and names the missing locale', () => {
    renderPanel(PARITY_FA)
    expect(screen.getByRole('button', { name: /publish/i })).toBeDisabled()
    expect(screen.getByText(/Persian|fa/i)).toBeInTheDocument()
    expect(
      screen.getByText(/publish is blocked by 1 blocker/i),
    ).toBeInTheDocument()
  })

  it('blocks publish in the missing-EN direction too, because parity is a blocker both ways', () => {
    renderPanel({
      blocking: [
        {
          code: 'MISSING_LOCALE_PROJECTION',
          nodeKey: 'project-9f8e7d6c',
          messageToken: 'parity.missing.en',
        },
      ],
      warnings: [],
    })
    expect(screen.getByRole('button', { name: /publish/i })).toBeDisabled()
    expect(screen.getByText(/English|en/i)).toBeInTheDocument()
  })

  it('keeps publish enabled for a genuine warning (SUMMARY_MISSING) while a parity blocker still disables it', () => {
    renderPanel({
      blocking: [],
      warnings: [
        {
          code: 'SUMMARY_MISSING',
          nodeKey: 'method-11223344',
          messageToken: 'summary.missing',
        },
      ],
    })
    expect(screen.getByRole('button', { name: /publish/i })).toBeEnabled()
    expect(screen.getByText(/1 warning/i)).toBeInTheDocument()
  })

  it('blocks publish on inactive taxonomy and missing canonical records', () => {
    renderPanel({
      blocking: [
        {
          code: 'NODE_TYPE_INACTIVE',
          nodeKey: 'project-2b3c4d5e',
          messageToken: 'atlas.nodeTypeInactive',
        },
        {
          code: 'CANONICAL_SOURCE_MISSING',
          nodeKey: 'method-11223344',
          messageToken: 'atlas.canonicalSourceMissing',
        },
      ],
      warnings: [],
    })
    expect(screen.getByRole('button', { name: /publish/i })).toBeDisabled()
    expect(screen.getByText(/inactive node type/i)).toBeInTheDocument()
    expect(screen.getByText(/canonical record/i)).toBeInTheDocument()
  })

  it('disables publish while any blocker exists and shows both counts', () => {
    renderPanel({
      blocking: [
        {
          code: 'HIERARCHY_CYCLE',
          relationKey: 'a~contains~b',
          messageToken: 'atlas.hierarchyCycle',
        },
      ],
      warnings: [
        {
          code: 'ISOLATED_NODE',
          nodeKey: 'method-11223344',
          messageToken: 'atlas.isolatedNode',
        },
      ],
    })
    expect(screen.getByRole('button', { name: /publish/i })).toBeDisabled()
    expect(
      screen.getByText(/publish is blocked by 1 blocker/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/1 warning/i)).toBeInTheDocument()
  })

  it('sends each blocker Go-to to the right entity', () => {
    const issue = {
      code: 'NODE_TYPE_INACTIVE',
      nodeKey: 'project-2b3c4d5e',
      messageToken: 'atlas.nodeTypeInactive',
    }
    const { onGoTo } = renderPanel({ blocking: [issue], warnings: [] })
    fireEvent.click(screen.getByRole('button', { name: /go to/i }))
    expect(onGoTo).toHaveBeenCalledWith(issue)
  })

  it('renders group issues with no Go-to target', () => {
    renderPanel({
      blocking: [
        {
          code: 'GROUP_LOCALE_MISSING',
          groupKey: 'group-1a2b3c4d',
          messageToken: 'atlas.groupLocaleMissing',
        },
      ],
      warnings: [],
    })
    expect(screen.getByText(/group-1a2b3c4d/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /go to/i })).toBeNull()
  })

  it('disables publish while a publish is already running', () => {
    render(
      <ValidationPanel
        issues={{ blocking: [], warnings: [] }}
        onGoTo={() => {}}
        onPublish={() => {}}
        publishPending
      />,
    )
    expect(screen.getByRole('button', { name: /publish/i })).toBeDisabled()
  })
})
