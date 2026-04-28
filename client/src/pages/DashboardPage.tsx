import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import CalendarView from "../components/CalendarView";
import CreateScheduleModal from "../components/CreateScheduleModal";
import IncomingSchedules from "../components/IncomingSchedules";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"PRIBADI" | "UNIT" | "BERSAMA">("BERSAMA");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScheduleCreated = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header + Tombol Tambah */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Selamat Datang, {user?.name?.split(" ")[0]}! 👋</h1>
          <p className="text-slate-500 mt-1">Berikut adalah gambaran jadwal operasional hari ini.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-5 py-2.5 bg-[#ff7900] text-white font-medium rounded-lg hover:bg-[#e06900] transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          <Plus size={18} className="mr-2" />
          Tambah Jadwal
        </button>
      </div>

      {/* Undangan Jadwal Masuk (muncul otomatis jika ada) */}
      <IncomingSchedules />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("PRIBADI")}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors duration-200 border-b-2 ${
              activeTab === "PRIBADI"
                ? "border-kai-orange text-kai-blue"
                : "border-transparent text-slate-500 hover:text-kai-blue"
            }`}
          >
            Jadwal Saya
          </button>
          <button
            onClick={() => setActiveTab("UNIT")}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors duration-200 border-b-2 ${
              activeTab === "UNIT"
                ? "border-kai-orange text-kai-blue"
                : "border-transparent text-slate-500 hover:text-kai-blue"
            }`}
          >
            Jadwal Unit
          </button>
          <button
            onClick={() => setActiveTab("BERSAMA")}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors duration-200 border-b-2 ${
              activeTab === "BERSAMA"
                ? "border-kai-orange text-kai-blue"
                : "border-transparent text-slate-500 hover:text-kai-blue"
            }`}
          >
            Jadwal Bersama
          </button>
        </div>

      {/* Calendar */}
      <CalendarView key={refreshKey} currentView={activeTab} userId={user?.id} />

      {/* Modal Tambah Jadwal */}
      <CreateScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleScheduleCreated}
      />
    </div>
  );
}
