import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, User, Calendar } from "lucide-react";
import api from "../lib/api";

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/schedules/pending");
      setSchedules(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menyetujui jadwal ini?")) return;
    setProcessing(id);
    try {
      await api.patch(`/schedules/${id}/approve`);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || "Gagal menyetujui.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menolak jadwal ini?")) return;
    setProcessing(id);
    try {
      await api.patch(`/schedules/${id}/reject`);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || "Gagal menolak.");
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-blue"></div>
        <span className="ml-3 text-slate-500">Memuat data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-bold text-kai-blue tracking-tight">Persetujuan Jadwal</h1>
        <p className="text-slate-500 mt-1">Kelola dan tinjau jadwal yang menunggu persetujuan dari pegawai.</p>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <CheckCircle size={56} className="mx-auto text-green-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Semua Bersih!</h3>
          <p className="text-slate-500 mt-1">Tidak ada jadwal yang menunggu persetujuan saat ini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">
              {schedules.length} jadwal menunggu persetujuan
            </span>
          </div>

          {schedules.map((s) => (
            <div key={s.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  {/* Info Jadwal */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="text-lg font-semibold text-slate-800 truncate">
                      {s.notes || "Jadwal Tanpa Judul"}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                      <span className="flex items-center">
                        <User size={14} className="mr-1.5 text-slate-400" />
                        {s.user?.name || "—"} ({s.user?.nipp})
                      </span>
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1.5 text-slate-400" />
                        {formatDate(s.start_time)} — {formatDate(s.end_time)}
                      </span>
                      <span className="flex items-center">
                        <Clock size={14} className="mr-1.5 text-slate-400" />
                        Diajukan {formatDate(s.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                        PENDING
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        s.isGlobal 
                          ? "bg-blue-50 text-blue-700 border border-blue-100" 
                          : "bg-green-50 text-green-700 border border-green-100"
                      }`}>
                        {s.isGlobal ? "Keseluruhan" : "Pribadi"}
                      </span>
                      {s.type === "TAMU" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                          Tamu: {s.guest?.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="flex items-center space-x-2 ml-4 shrink-0">
                    <button
                      onClick={() => handleApprove(s.id)}
                      disabled={processing === s.id}
                      className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-sm"
                    >
                      <CheckCircle size={16} className="mr-1.5" />
                      Setujui
                    </button>
                    <button
                      onClick={() => handleReject(s.id)}
                      disabled={processing === s.id}
                      className="flex items-center px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                    >
                      <XCircle size={16} className="mr-1.5" />
                      Tolak
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
