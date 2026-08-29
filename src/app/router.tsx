import { Navigate, Route, Routes } from 'react-router-dom'

import { DashboardPage } from '@/pages/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SignInPage } from '@/pages/SignInPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="sign-in" element={<SignInPage />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
