import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

/**
 * Komponen pelindung rute.
 * - Jika belum login, redirect ke /login.
 * - Jika allowedRoles ditentukan dan role user tidak cocok, redirect ke /dashboard.
 * - Jika lolos, render child routes via <Outlet />.
 */
export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kai-bg">
        <div className="animate-pulse text-kai-blue font-semibold text-lg">Memuat sesi...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
