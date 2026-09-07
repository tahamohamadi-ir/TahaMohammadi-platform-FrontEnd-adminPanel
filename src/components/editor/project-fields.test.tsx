import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ProjectFields } from '@/components/editor/project-fields'

function Harness({ initial = {} }: { initial?: Record<string, unknown> }) {
  const [fields, setFields] = useState<Record<string, unknown>>(initial)
  const onChangeRef = useRef(
    vi.fn((key: string, value: unknown) => {
      setFields((prev) => ({ ...prev, [key]: value }))
    }),
  )
  const onChange = onChangeRef.current
  return (
    <>
      <ProjectFields fields={fields} onChange={onChange} disabled={false} />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('project family editor (PU-10-project)', () => {
  it('fails before the family editor when project fields are missing', () => {
    render(<Harness />)
    for (const label of [
      /project type/i,
      /objective/i,
      /methods summary/i,
      /role/i,
      /start date/i,
      /end date/i,
      /code availability/i,
      /show on projects index/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('propagates typed project metadata without inventing keys', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText(/role/i), {
      target: { value: 'Lead researcher' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['role', 'Lead researcher']),
    )
    fireEvent.click(screen.getByLabelText(/show on projects index/i))
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['showOnProjects', true]),
    )
  })
})
