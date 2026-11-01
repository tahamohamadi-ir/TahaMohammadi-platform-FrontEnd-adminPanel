import { Navigate, Route, Routes, useParams } from 'react-router-dom'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/shell/AppShell'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { AtlasEditorPage } from '@/pages/AtlasEditorPage'
import { AtlasPreviewPage } from '@/pages/AtlasPreviewPage'
import { AtlasTaxonomyPage } from '@/pages/AtlasTaxonomyPage'
import { AtlasVersionsPage } from '@/pages/AtlasVersionsPage'
import { ApprovalQueuePage } from '@/pages/ApprovalQueuePage'
import { ContentEditPage } from '@/pages/ContentEditPage'
import { ContentListPage } from '@/pages/ContentListPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { GraphEditPage } from '@/pages/GraphEditPage'
import { GraphPage } from '@/pages/GraphPage'
import { HomePage } from '@/pages/HomePage'
import { MediaPage } from '@/pages/MediaPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PublicationJobsPage } from '@/pages/PublicationJobsPage'
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
        element={
          <ProtectedRoute requireStaff>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="home" element={<HomePage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="approvals" element={<ApprovalQueuePage />} />
        <Route path="publication-jobs" element={<PublicationJobsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="graph" element={<GraphPage />} />
        <Route path="graph/:versionId" element={<GraphEditPage />} />
        <Route path="media" element={<MediaPage />} />
        <Route path="content/:entity" element={<ContentListPageRoute />} />
        <Route path="content/:entity/new" element={<ContentEditPageRoute />} />
        <Route path="content/:entity/:id" element={<ContentEditPageRoute />} />
        <Route path="atlas" element={<AtlasVersionsPage />} />
        <Route path="atlas/:versionId" element={<AtlasEditorPage />} />
        <Route path="atlas/taxonomy" element={<AtlasTaxonomyPage />} />
        <Route path="atlas/:versionId/preview" element={<AtlasPreviewPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
