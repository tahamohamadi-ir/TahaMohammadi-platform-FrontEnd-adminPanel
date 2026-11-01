import { Toaster as Sonner, toast } from 'sonner'

import { usePreferences } from '@/lib/preferences/PreferencesProvider'

/** App-wide toast host. Toasts confirm transient, non-blocking outcomes
 * only; errors that need action stay as inline Alerts next to the form. */
export function Toaster() {
  const { resolvedTheme, dir } = usePreferences()
  return (
    <Sonner
      theme={resolvedTheme}
      dir={dir}
      position={dir === 'rtl' ? 'bottom-left' : 'bottom-right'}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'border border-border! bg-popover! text-popover-foreground! shadow-lg!',
          description: 'text-muted-foreground!',
        },
      }}
    />
  )
}

export { toast }
