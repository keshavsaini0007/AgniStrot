import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { LandingPage } from '@/pages/public/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import {
  DashboardPage,
  MinesPage,
  MineDetailPage,
  InspectionsPage,
  InspectionDetailPage,
  ObservationsPage,
  ObservationDetailPage,
  CorrectiveActionsPage,
  CompliancePage,
  DocumentsPage,
  AnalyticsPage,
  GISPage,
  ReportsPage,
  NotificationsPage,
  UsersPage,
  AuditLogsPage,
  SettingsPage,
} from '@/pages/app';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  const { fetchCurrentUser, isLoading } = useAuthStore();

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0D0E] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D88A32] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/app/dashboard" element={<DashboardPage />} />
              <Route path="/app/mines" element={<MinesPage />} />
              <Route path="/app/mines/:mineId" element={<MineDetailPage />} />
              <Route path="/app/inspections" element={<InspectionsPage />} />
              <Route path="/app/inspections/:inspectionId" element={<InspectionDetailPage />} />
              <Route path="/app/observations" element={<ObservationsPage />} />
              <Route path="/app/observations/:observationId" element={<ObservationDetailPage />} />
              <Route path="/app/corrective-actions" element={<CorrectiveActionsPage />} />
              <Route path="/app/compliance" element={<CompliancePage />} />
              <Route path="/app/compliance/:complianceId" element={<CompliancePage />} />
              <Route path="/app/documents" element={<DocumentsPage />} />
              <Route path="/app/analytics" element={<AnalyticsPage />} />
              <Route path="/app/gis" element={<GISPage />} />
              <Route path="/app/reports" element={<ReportsPage />} />
              <Route path="/app/notifications" element={<NotificationsPage />} />
              <Route path="/app/users" element={<UsersPage />} />
              <Route path="/app/audit-logs" element={<AuditLogsPage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;