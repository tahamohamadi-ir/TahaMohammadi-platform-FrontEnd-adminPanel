import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export const alertVariants = cva(
  'relative grid w-full max-w-3xl grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 rounded-lg border border-s-4 bg-card px-4 py-3 text-sm text-card-foreground [&>svg]:mt-0.5 [&>svg]:size-4',
  {
    variants: {
      variant: {
        default: 'border-border [&>svg]:text-foreground',
        error:
          'border-destructive/50 border-s-destructive bg-destructive/5 [&>svg]:text-destructive',
        success:
          'border-success/40 border-s-success bg-success/5 [&>svg]:text-success',
        warning:
          'border-warning/40 border-s-warning bg-warning/8 [&>svg]:text-warning',
        info: 'border-info/40 border-s-info bg-info/5 [&>svg]:text-info',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Alert({
  className,
  variant,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      className={cn(alertVariants({ variant }), 'mb-4', className)}
      {...props}
    />
  )
}

export function AlertTitle({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="alert-title"
      className={cn('col-start-2 m-0 font-semibold leading-snug', className)}
      {...props}
    />
  )
}

export function AlertDescription({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'col-start-2 mt-1 text-sm text-foreground/85 [&_p]:m-0 [&_p+p]:mt-2',
        className,
      )}
      {...props}
    />
  )
}
