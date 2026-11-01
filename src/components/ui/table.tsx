import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/* shadcn table parts. The scroll wrapper is a labelled, focusable region so
 * keyboard users can scroll wide tables (WCAG 2.1.1). */

export function TableScroll({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      role="region"
      tabIndex={0}
      className={cn(
        'relative w-full overflow-x-auto rounded-lg border bg-card focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  )
}

export function TableEl({ className, ...props }: ComponentProps<'table'>) {
  return (
    <table
      className={cn('w-full caption-top border-collapse text-sm', className)}
      {...props}
    />
  )
}

export function TableCaption({
  className,
  ...props
}: ComponentProps<'caption'>) {
  return (
    <caption
      className={cn(
        'px-4 py-3 text-start text-sm font-semibold text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('bg-muted', className)} {...props} />
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  )
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'border-t transition-colors hover:bg-accent/40 data-[state=selected]:bg-accent',
        className,
      )}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-10 px-4 text-start align-middle text-xs font-semibold tracking-wide whitespace-nowrap text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-4 py-2.5 align-top', className)} {...props} />
}
