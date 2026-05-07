import { Link, useLocation, useNavigate } from "react-router-dom";
import { Calendar, Users, Building, Settings, LogOut, ChevronDown, ChevronRight, Shield, Activity, ClipboardCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { user, logout } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "MANAJER" || user?.role === "ASISTEN_MANAJER";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // Buka otomatis dropdown pengaturan jika sedang di sub-menu pengaturan
  useEffect(() => {
    if (pathname.startsWith("/admin/settings")) {
      setIsSettingsOpen(true);
    }
  }, [pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-[#0c1040] text-white flex flex-col h-screen fixed top-0 left-0 shadow-2xl z-50">
      <div className="p-6 border-b border-white/10 bg-[#0a0d36]">
        <h1 className="text-2xl font-black tracking-widest text-white">
          KAI <span className="text-[#ff7900]">DAOP 6</span>
        </h1>
        <p className="text-xs text-slate-300 mt-1.5 opacity-70 tracking-widest uppercase">Sistem Jadwal</p>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        
        <Link
          to="/dashboard"
          className={`flex items-center space-x-3 px-4 py-3.5 rounded-lg transition-all duration-200 ${
            pathname === "/dashboard" 
              ? "bg-[#ff7900] text-white shadow-md shadow-[#ff7900]/20" 
              : "hover:bg-white/5 text-slate-300 hover:text-white"
          }`}
        >
          <Calendar size={20} className={pathname === "/dashboard" ? "opacity-100" : "opacity-70"} />
          <span className="font-medium tracking-wide text-sm">Beranda Jadwal</span>
        </Link>

        {isAdmin && (
          <>
            <Link
              to="/admin/schedules"
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-lg transition-all duration-200 ${
                pathname === "/admin/schedules" 
                  ? "bg-[#ff7900] text-white shadow-md shadow-[#ff7900]/20" 
                  : "hover:bg-white/5 text-slate-300 hover:text-white"
              }`}
            >
              <ClipboardCheck size={20} className={pathname === "/admin/schedules" ? "opacity-100" : "opacity-70"} />
              <span className="font-medium tracking-wide text-sm">Persetujuan Jadwal</span>
            </Link>

            <Link
              to="/admin/users"
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-lg transition-all duration-200 ${
                pathname === "/admin/users" 
                  ? "bg-[#ff7900] text-white shadow-md shadow-[#ff7900]/20" 
                  : "hover:bg-white/5 text-slate-300 hover:text-white"
              }`}
            >
              <Users size={20} className={pathname === "/admin/users" ? "opacity-100" : "opacity-70"} />
              <span className="font-medium tracking-wide text-sm">Manajemen Pegawai</span>
            </Link>

            <Link
              to="/admin/units"
              className={`flex items-center space-x-3 px-4 py-3.5 rounded-lg transition-all duration-200 ${
                pathname === "/admin/units" 
                  ? "bg-[#ff7900] text-white shadow-md shadow-[#ff7900]/20" 
                  : "hover:bg-white/5 text-slate-300 hover:text-white"
              }`}
            >
              <Building size={20} className={pathname === "/admin/units" ? "opacity-100" : "opacity-70"} />
              <span className="font-medium tracking-wide text-sm">Manajemen Unit</span>
            </Link>
          </>
        )}

        {/* Collapsible Settings Menu */}
        <div className="pt-1">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-lg transition-all duration-200 ${
              pathname.startsWith("/admin/settings") && !isSettingsOpen
                ? "bg-white/10 text-white"
                : "hover:bg-white/5 text-slate-300 hover:text-white"
            }`}
          >
            <div className="flex items-center space-x-3">
              <Settings size={20} className="opacity-70" />
              <span className="font-medium tracking-wide text-sm">Pengaturan</span>
            </div>
            {isSettingsOpen ? <ChevronDown size={16} className="opacity-50" /> : <ChevronRight size={16} className="opacity-50" />}
          </button>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSettingsOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            <div className="pl-11 pr-4 py-1 space-y-1">
              
              <Link
                to="/admin/settings/profile"
                className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-md transition-all duration-200 ${
                  pathname === "/admin/settings/profile"
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Shield size={16} />
                <span className="text-xs font-medium">Keamanan & Profil</span>
              </Link>

              {isSuperAdmin && (
                <Link
                  to="/admin/settings/logs"
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-md transition-all duration-200 ${
                    pathname === "/admin/settings/logs"
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Activity size={16} />
                  <span className="text-xs font-medium">Riwayat Aktivitas</span>
                </Link>
              )}

            </div>
          </div>
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-white/10 bg-[#0a0d36]">
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg w-full hover:bg-red-500/10 text-slate-300 hover:text-red-400 transition-all duration-200"
        >
          <LogOut size={20} className="opacity-70" />
          <span className="font-medium tracking-wide text-sm">Keluar Akun</span>
        </button>
      </div>
    </aside>
  );
}
