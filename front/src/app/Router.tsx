// src/app/Router.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canUploadMaterials } from '../lib/permissions'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { HomePage } from '../pages/HomePage'
import { UploadPage } from '../pages/UploadPage'
import { MaterialsPage } from '../pages/MaterialsPage'
import { MaterialDetailPage } from '../pages/MaterialDetailPage'
import { AdminDashboardPage } from '../pages/AdminDashboardPage'
import { AdminUsersPage } from '../pages/AdminUsersPage'
import { AdminLogsPage } from '../pages/AdminLogsPage'
import { ProfessorReviewPage } from '../pages/ProfessorReviewPage'
import { AllMaterialsPage } from '../pages/AllMaterialsPage'
import { CreateOrganizationPage }    from '../pages/CreateOrganizationPage'
import { OrganizationsListPage }     from '../pages/OrganizationsListPage'
import { OrganizationDetailPage }    from '../pages/OrganizationDetailPage'
import { InvitesPage }               from '../pages/InvitesPage'
import { MaterialChatPage } from '../pages/MaterialChatPage'
import { VerifyEmailSentPage } from '../pages/VerifyEmailSentPage'
import { NotFoundPage } from '../pages/NotFoundPage'

// ── Guards ─────────────────────────────────────────────────────────────────────

/** Redireciona para "/" se o usuário já estiver autenticado */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

/** Redireciona para "/login" se o usuário não estiver autenticado */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

/** Redireciona para "/" se o usuário não for ADMIN (sysadmin) */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

/** Redireciona para "/" se o usuário não for PROFESSOR ou ADMIN */
function ProfessorRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'PROFESSOR' && user?.role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

/** Exige login e permissão de submissão (@dcx.ufpb.br ou ADMIN) */
function UploadRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!canUploadMaterials(user)) return <Navigate to="/" replace />
  return <>{children}</>
}

// ── Rotas ──────────────────────────────────────────────────────────────────────

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas — redirecionam para / se já autenticado */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Pública — página principal acessível sem login (apenas materiais) */}
        <Route path="/" element={<HomePage />} />

        {/* Detalhe de um material específico — o acesso é validado pela API */}
        <Route path="/materials/:id" element={<MaterialDetailPage />} />

        {/* Submissão — login + permissão (@dcx.ufpb.br ou ADMIN) */}
        <Route
          path="/upload"
          element={
            <UploadRoute>
              <UploadPage />
            </UploadRoute>
          }
        />

        {/* Requer login (qualquer usuário autenticado) */}
        <Route
          path="/materials"
          element={
            <PrivateRoute>
              <MaterialsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/materials/:materialId/chat"
          element={
            <PrivateRoute>
              <MaterialChatPage />
            </PrivateRoute>
          }
        />

        {/* Exclusivas do ADMIN (sysadmin) */}
        <Route
          path="/professor/review"
          element={
            <AdminRoute>
              <ProfessorReviewPage />
            </AdminRoute>
          }
        />
        <Route
          path="/professor/materials"
          element={
            <ProfessorRoute>
              <AllMaterialsPage />
            </ProfessorRoute>
          }
        />

        {/* Organizações — acessível para qualquer usuário autenticado */}
        <Route
          path="/organizations"
          element={
            <PrivateRoute>
              <OrganizationsListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/organizations/:orgId"
          element={
            <PrivateRoute>
              <OrganizationDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/invites"
          element={
            <PrivateRoute>
              <InvitesPage />
            </PrivateRoute>
          }
        />

        {/* Exclusivas de PROFESSOR e ADMIN */}
        <Route
          path="/organizations/create"
          element={
            <ProfessorRoute>
              <CreateOrganizationPage />
            </ProfessorRoute>
          }
        />

        {/* Exclusivas de ADMIN */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <AdminRoute>
              <AdminLogsPage />
            </AdminRoute>
          }
        />

        {/* Verificação de e-mail — acessível sem autenticação */}
        <Route path="/verify-email-sent" element={<VerifyEmailSentPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
