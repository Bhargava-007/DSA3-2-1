import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { UploadPage } from '@/pages/UploadPage'
import { PipelinePage } from '@/pages/PipelinePage'
import { ClusterExplorerPage } from '@/pages/ClusterExplorerPage'
import { ComparePage } from '@/pages/ComparePage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { BlockingPage } from '@/pages/BlockingPage'
import { SimilarityPage } from '@/pages/SimilarityPage'
import { ClusteringPage } from '@/pages/ClusteringPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ExportsPage } from '@/pages/ExportsPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'

import { CacheProvider } from '@/context/CacheContext'

export const App: React.FC = () => {
  return (
    <CacheProvider>
      <BrowserRouter>
      <Routes>
        {/* Workspace Routes */}
        <Route
          path="/"
          element={
            <AppShell>
              <DashboardPage />
            </AppShell>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AppShell>
              <DashboardPage />
            </AppShell>
          }
        />
        <Route
          path="/datasets"
          element={
            <AppShell>
              <UploadPage />
            </AppShell>
          }
        />
        <Route
          path="/upload"
          element={
            <AppShell>
              <UploadPage />
            </AppShell>
          }
        />
        <Route
          path="/pipeline"
          element={
            <AppShell>
              <PipelinePage />
            </AppShell>
          }
        />
        <Route
          path="/entities"
          element={
            <AppShell>
              <ClusterExplorerPage />
            </AppShell>
          }
        />
        <Route
          path="/clusters"
          element={
            <AppShell>
              <ClusterExplorerPage />
            </AppShell>
          }
        />
        <Route
          path="/match-explorer"
          element={
            <AppShell>
              <ComparePage />
            </AppShell>
          }
        />
        <Route
          path="/compare"
          element={
            <AppShell>
              <ComparePage />
            </AppShell>
          }
        />
        <Route
          path="/analytics"
          element={
            <AppShell>
              <AnalyticsPage />
            </AppShell>
          }
        />

        {/* Algorithm Routes */}
        <Route
          path="/algorithms/blocking"
          element={
            <AppShell>
              <BlockingPage />
            </AppShell>
          }
        />
        <Route
          path="/algorithms/similarity"
          element={
            <AppShell>
              <SimilarityPage />
            </AppShell>
          }
        />
        <Route
          path="/algorithms/clustering"
          element={
            <AppShell>
              <ClusteringPage />
            </AppShell>
          }
        />

        {/* System Routes */}
        <Route
          path="/configuration"
          element={
            <AppShell>
              <SettingsPage />
            </AppShell>
          }
        />
        <Route
          path="/settings"
          element={
            <AppShell>
              <SettingsPage />
            </AppShell>
          }
        />
        <Route
          path="/exports"
          element={
            <AppShell>
              <ExportsPage />
            </AppShell>
          }
        />

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </CacheProvider>
  )
}

export default App
