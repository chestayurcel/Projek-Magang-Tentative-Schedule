import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, User, Calendar, Mail } from "lucide-react";
import api from "../lib/api";

export default function IncomingSchedules() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    fetchIncoming();
  }, []);

  const fetchIncoming = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/schedules/incoming");
      setSchedules(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = async (id: number, action: "approve" | "reject") => {
    const label = action === "approve" ? "menyetujui" : "menolak";
    if (!confirm(`Apakah Anda yakin ingin ${label} undangan jadwal ini?`)) return;

    setProcessing(id);
    try {
      const res = await api.patch(`/schedules/${id}/respond`, { action });
      alert(res.data.message);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || "Gagal merespons.");
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
    return null; // Tidak tampilkan apa-apa saat loading
  }

  if (schedules.length === 0) {
    return null; // Sembunyikan section jika tidak ada undangan
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Mail size={20} className="text-kai-orange" />
        <h2 className="text-lg font-bold text-slate-800">
          Undangan Jadwal Masuk
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
            {schedules.length}
          </span>
        </h2>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {schedules.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="border-l-4 border-amber-400 p-4">
              <div className="flex items-start justify-between">
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <h3 className="font-semibold text-slate-800">
                    {s.notes || "Jadwal Tanpa Judul"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="flex items-center">
                      <User size={14} className="mr-1.5 text-amber-500" />
                      Dari: <strong className="ml-1 text-slate-700">{s.user?.name}</strong>
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
                </div>

                {/* Tombol Aksi */}
                <div className="flex items-center space-x-2 ml-4 shrink-0">
                  <button
                    onClick={() => handleRespond(s.id, "approve")}
                    disabled={processing === s.id}
                    className="flex items-center px-3.5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-sm"
                  >
                    <CheckCircle size={16} className="mr-1.5" />
                    Terima
                  </button>
                  <button
                    onClick={() => handleRespond(s.id, "reject")}
                    disabled={processing === s.id}
                    className="flex items-center px-3.5 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50"
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
    </div>
  );
}
