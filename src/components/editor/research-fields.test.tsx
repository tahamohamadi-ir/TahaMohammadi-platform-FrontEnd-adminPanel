import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ResearchFields } from '@/components/editor/research-fields'

function Harness({
  entity = 'research-topic',
  initial = {},
}: {
  entity?: 'research-topic' | 'research-statement'
  initial?: Record<string, unknown>
}) {
  const [fields, setFields] = useState<Record<string, unknown>>(initial)
  const onChangeRef = useRef(
    vi.fn((key: string, value: unknown) => {
      setFields((prev) => ({ ...prev, [key]: value }))
    }),
  )
  const onChange = onChangeRef.current
  return (
    <>
      <ResearchFields
        entity={entity}
        fields={fields}
        onChange={onChange}
        disabled={false}
      />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('research family editor (PU-10-research)', () => {
  it('fails before the family editor when research fields are missing', () => {
    render(<Harness entity="research-topic" />)
    // Every backend research-topic key must have a control; a missing one
    // means the family slice is incomplete, not that the key may be dropped.
    for (const label of [
      /summary/i,
      /motivation/i,
      /problems/i,
      /research questions/i,
      /methods/i,
      /future directions/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('renders statement-only fields for research statements', () => {
    render(
      <Harness
        entity="research-statement"
        initial={{ body: 'We hold that…', statementPdfId: 4 }}
      />,
    )
    expect(screen.getByLabelText(/statement body/i)).toHaveProperty(
      'value',
      'We hold that…',
    )
    expect(screen.getByLabelText(/statement pdf/i)).toHaveProperty('value', '4')
    expect(screen.queryByLabelText(/motivation/i)).toBeNull()
  })

  it('propagates typed metadata without inventing keys', () => {
    render(<Harness entity="research-topic" />)
    fireEvent.change(screen.getByLabelText(/summary/i), {
      target: { value: 'Graph reasoning' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['summary', 'Graph reasoning']),
    )
  })

  it('rejects malformed related-records JSON locally and never propagates it', () => {
    render(<Harness entity="research-topic" />)
    const input = screen.getByLabelText(/related records/i)
    fireEvent.change(input, { target: { value: '{oops' } })
    expect(screen.getByRole('alert').textContent).toMatch(/invalid json/i)
    expect(screen.getByTestId('last-change').textContent).toBe('null')
    fireEvent.change(input, {
      target: { value: '[{"family":"article","id":7}]' },
    })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['relatedRecords', [{ family: 'article', id: 7 }]]),
    )
  })
})
