import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AdminSchedulesPage from "./pages/AdminSchedulesPage";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminUnitsPage from "./pages/AdminUnitsPage";
import ProfilePage from "./pages/ProfilePage";
import RecapSchedules from "./pages/RecapSchedules";

function App() {
  return (
    <Routes>
      {/* Rute Publik */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Rute Terproteksi - Semua user yang sudah login */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Rute Admin */}
          <Route path="/admin/schedules" element={<AdminSchedulesPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/units" element={<AdminUnitsPage />} />
          <Route path="/admin/recap" element={<RecapSchedules />} />
          <Route path="/admin/settings/profile" element={<ProfilePage />} />
          <Route path="/admin/settings/logs" element={<div className="text-slate-500 text-center py-16">🚧 Halaman Riwayat Aktivitas dalam pengembangan.</div>} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
