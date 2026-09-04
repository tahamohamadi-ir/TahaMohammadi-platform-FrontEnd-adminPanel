import { Navigate, Route, Routes, useParams } from 'react-router-dom'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ApprovalQueuePage } from '@/pages/ApprovalQueuePage'
import { ContentEditPage } from '@/pages/ContentEditPage'
import { ContentListPage } from '@/pages/ContentListPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { GraphEditPage } from '@/pages/GraphEditPage'
import { GraphPage } from '@/pages/GraphPage'
import { HomePage } from '@/pages/HomePage'
import { MediaPage } from '@/pages/MediaPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SignInPage } from '@/pages/SignInPage'
import { TimelinePage } from '@/pages/TimelinePage'

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
        path="home"
        element={
          <ProtectedRoute requireStaff>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="timeline"
        element={
          <ProtectedRoute requireStaff>
            <TimelinePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="approvals"
        element={
          <ProtectedRoute requireStaff>
            <ApprovalQueuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="graph"
        element={
          <ProtectedRoute requireStaff>
            <GraphPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="graph/:versionId"
        element={
          <ProtectedRoute requireStaff>
            <GraphEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="media"
        element={
          <ProtectedRoute requireStaff>
            <MediaPage />
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
