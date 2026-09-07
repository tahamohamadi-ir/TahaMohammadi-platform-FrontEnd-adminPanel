import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { PublicationFields } from '@/components/editor/publication-fields'

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
      <PublicationFields fields={fields} onChange={onChange} disabled={false} />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('publication family editor (PU-10-publication)', () => {
  it('fails before the family editor when publication fields are missing', () => {
    render(<Harness />)
    for (const label of [
      /authors/i,
      /venue/i,
      /^doi$/i,
      /abstract/i,
      /publication type/i,
      /citation count/i,
      /citation visibility/i,
      /pdf media/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('propagates typed publication metadata without inventing keys', () => {
    render(<Harness initial={{ doi: '10.0/old' }} />)
    fireEvent.change(screen.getByLabelText(/^doi$/i), {
      target: { value: '10.0/new' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['doi', '10.0/new']),
    )
    fireEvent.change(screen.getByLabelText(/citation count/i), {
      target: { value: '12' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['citationCount', 12]),
    )
  })
})
