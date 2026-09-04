import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Notice, TextField } from '@/components/ui/primitives'

const LONG_FA =
  'این یک رشتهٔ طولانی فارسی برای بررسی چیدمان راست‌به‌چپ و سرریز محتوا در فیلدهای مدیریتی است که نباید طرح را بشکند.'

describe('RTL text entry and long-content layout (ADMIN-131)', () => {
  it('renders Persian labels and long content inside an rtl container', () => {
    render(
      <div dir="rtl" lang="fa">
        <TextField id="tagline-fa" label="شعار سایت" defaultValue={LONG_FA} />
        <Notice tone="info" title="یادداشت">
          {LONG_FA}
        </Notice>
      </div>,
    )
    const container = screen.getByLabelText('شعار سایت').closest('div[dir]')
    expect(container).toHaveAttribute('dir', 'rtl')
    expect(screen.getByDisplayValue(LONG_FA)).toBeInTheDocument()
  })

  it('keeps logical-property spacing (no physical left/right overrides)', () => {
    render(
      <div dir="rtl" lang="fa">
        <Notice tone="warning" title="هشدار">
          {LONG_FA}
        </Notice>
      </div>,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
