import { BrowserRouter } from 'react-router-dom'

import { adminBasePath } from '@/config/env'
import { AppRouter } from '@/app/router'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { QueryProvider } from '@/lib/query/provider'

export function App() {
  return (
    <BrowserRouter basename={adminBasePath}>
      <QueryProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  )
}
