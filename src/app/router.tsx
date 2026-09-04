import { Navigate, Route, Routes, useParams } from 'react-router-dom'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ContentEditPage } from '@/pages/ContentEditPage'
import { ContentListPage } from '@/pages/ContentListPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SignInPage } from '@/pages/SignInPage'

function ContentListPageRoute() {
  const { entity } = useParams()
  return <ContentListPage entity={entity ?? ''} />
}

function ContentEditPageRoute() {
  const { entity } = useParams()
  return <ContentEditPage entity={entity ?? ''} />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="sign-in" element={<SignInPage />} />
      <Route
        path="dashboard"
        element={
          <ProtectedRoute requireStaff>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="settings"
        element={
          <ProtectedRoute requireStaff>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="content/:entity"
        element={
          <ProtectedRoute requireStaff>
            <ContentListPageRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="content/:entity/new"
        element={
          <ProtectedRoute requireStaff>
            <ContentEditPageRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="content/:entity/:id"
        element={
          <ProtectedRoute requireStaff>
            <ContentEditPageRoute />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
