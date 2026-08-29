import { BrowserRouter } from 'react-router-dom'

import { adminBasePath } from '@/config/env'
import { AppRouter } from '@/app/router'
import { AuthProvider } from '@/lib/auth/AuthProvider'

export function App() {
  return (
    <BrowserRouter basename={adminBasePath}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  )
}
