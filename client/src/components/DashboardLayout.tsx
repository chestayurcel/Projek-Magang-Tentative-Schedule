import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-kai-bg">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
           <h2 className="text-xl font-semibold text-kai-blue tracking-tight">Dashboard Jadwal</h2>
           <div className="flex items-center space-x-3">
             <NotificationBell />
             <div className="w-px h-8 bg-slate-200 -ml-1 mr-2"></div>
             <div className="text-right mr-2">
               <p className="text-sm font-medium text-slate-800">{user?.name}</p>
               <p className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.unit?.unit_name || user?.role?.replace("_", " ")}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-kai-orange text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {user?.name?.charAt(0)?.toUpperCase() || "?"}
             </div>
           </div>
        </header>
        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
