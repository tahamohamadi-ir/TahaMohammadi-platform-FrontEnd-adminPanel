import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CreativeFields } from '@/components/editor/creative-fields'

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
      <CreativeFields fields={fields} onChange={onChange} disabled={false} />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('creative-work family editor (PU-10-creative)', () => {
  it('fails before the family editor when creative fields are missing', () => {
    render(<Harness />)
    for (const label of [
      /^description$/i,
      /work type/i,
      /creator name/i,
      /creator role/i,
      /creation date/i,
      /rights statement/i,
      /consent verified/i,
      /cover media/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('propagates typed creative metadata without inventing keys', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText(/work type/i), {
      target: { value: 'essay' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['workType', 'essay']),
    )
    fireEvent.click(screen.getByLabelText(/consent verified/i))
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['consentVerified', true]),
    )
  })
})
