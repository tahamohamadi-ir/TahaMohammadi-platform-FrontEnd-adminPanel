import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CollectionFields } from '@/components/editor/collection-fields'

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
      <CollectionFields fields={fields} onChange={onChange} disabled={false} />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('collection family editor (PU-10-collection)', () => {
  it('fails before the family editor when collection fields are missing', () => {
    render(<Harness />)
    for (const label of [
      /^description$/i,
      /curator name/i,
      /curator title/i,
      /criteria/i,
      /curated date/i,
      /cover media/i,
      /^members$/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('propagates ordered membership verbatim', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText(/^members$/i), {
      target: { value: '[{"family":"article","id":7}]' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['members', [{ family: 'article', id: 7 }]]),
    )
  })
})
