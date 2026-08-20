import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { UserRole } from "@/types";
import { Layout } from "./Layout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TicketsListPage } from "@/pages/TicketsListPage";
import { TicketCreatePage } from "@/pages/TicketCreatePage";
import { TicketDetailPage } from "@/pages/TicketDetailPage";
import { UsersPage } from "@/pages/UsersPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { AuditLogsPage } from "@/pages/AuditLogsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  if (!isInitialized) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  if (!isInitialized) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tickets" element={<TicketsListPage />} />
        <Route path="/tickets/new" element={<ProtectedRoute roles={["CUSTOMER", "ADMIN"]}><TicketCreatePage /></ProtectedRoute>} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/users" element={<ProtectedRoute roles={["ADMIN"]}><UsersPage /></ProtectedRoute>} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/analytics" element={<ProtectedRoute roles={["ADMIN"]}><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute roles={["ADMIN"]}><AuditLogsPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
