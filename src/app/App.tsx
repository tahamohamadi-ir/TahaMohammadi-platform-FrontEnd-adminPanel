import { BrowserRouter } from 'react-router-dom'

import { adminBasePath } from '@/config/env'
import { AppRouter } from '@/app/router'

export function App() {
  return (
    <BrowserRouter basename={adminBasePath}>
      <AppRouter />
    </BrowserRouter>
  )
}
