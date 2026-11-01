import { BrowserRouter } from 'react-router-dom'

import { adminBasePath } from '@/config/env'
import { AppRouter } from '@/app/router'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { PreferencesProvider } from '@/lib/preferences/PreferencesProvider'
import { QueryProvider } from '@/lib/query/provider'

export function App() {
  return (
    <PreferencesProvider>
      <BrowserRouter basename={adminBasePath}>
        <QueryProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </QueryProvider>
      </BrowserRouter>
    </PreferencesProvider>
  )
}
