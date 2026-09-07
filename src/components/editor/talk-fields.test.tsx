import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { TalkFields } from '@/components/editor/talk-fields'

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
      <TalkFields fields={fields} onChange={onChange} disabled={false} />
      <span data-testid="last-change">
        {JSON.stringify(onChange.mock.calls.at(-1) ?? null)}
      </span>
    </>
  )
}

describe('talk family editor (PU-10-talk)', () => {
  it('fails before the family editor when talk fields are missing', () => {
    render(<Harness />)
    for (const label of [
      /speakers/i,
      /event name/i,
      /event date/i,
      /location/i,
      /abstract/i,
      /video url/i,
      /slides url/i,
      /slides media/i,
      /seo title/i,
      /related records/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeDefined()
    }
  })

  it('propagates typed talk metadata without inventing keys', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText(/event name/i), {
      target: { value: 'Conf 2026' },
    })
    expect(screen.getByTestId('last-change').textContent).toBe(
      JSON.stringify(['eventName', 'Conf 2026']),
    )
  })
})
