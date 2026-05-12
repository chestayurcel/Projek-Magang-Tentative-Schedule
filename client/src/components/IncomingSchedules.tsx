import { useState, useEffect } from "react";
import { CheckCircle, XCircle, User, Calendar, Mail, Info, Users } from "lucide-react";
import api from "../lib/api";

// Tiap item dari /schedules/incoming punya field `kind`:
//   - PARTICIPANT : group meeting (multi-undangan via tabel ScheduleParticipant)
//   - MEETING     : single-target meeting lama (legacy)
//   - DELEGATION  : jadwal dititipkan oleh atasan
type IncomingKind = "PARTICIPANT" | "MEETING" | "DELEGATION";

export default function IncomingSchedules() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Gunakan composite key (kind + id) karena PARTICIPANT pakai scheduleId yang sama dgn schedule
  const [processing, setProcessing] = useState<string | null>(null);

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

  const handleRespond = async (
    scheduleId: number,
    kind: IncomingKind,
    action: "approve" | "reject"
  ) => {
    const label = action === "approve" ? "menyetujui" : "menolak";
    if (!confirm(`Apakah Anda yakin ingin ${label} undangan jadwal ini?`)) return;

    const key = `${kind}-${scheduleId}`;
    setProcessing(key);
    try {
      const res = await api.patch(`/schedules/${scheduleId}/respond`, { action, kind });
      alert(res.data.message);
      setSchedules(prev => prev.filter(s => `${s.kind}-${s.id}` !== key));
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
          Persetujuan Jadwal Masuk
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
            {schedules.length}
          </span>
        </h2>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {schedules.map((s) => {
          const kind: IncomingKind = (s.kind || "MEETING") as IncomingKind;
          const senderName = kind === "DELEGATION" ? s.creator?.name : s.user?.name;
          const key = `${kind}-${s.id}`;
          const isProcessing = processing === key;

          // Badge & banner styling per-kind
          const badgeStyle =
            kind === "DELEGATION"
              ? "bg-purple-50 text-purple-700 border-purple-200"
              : kind === "PARTICIPANT"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-amber-50 text-amber-700 border-amber-200";

          const banner =
            kind === "DELEGATION"
              ? `${senderName} mengajukan jadwal ke kalender pribadi Anda`
              : kind === "PARTICIPANT"
              ? `${senderName} mengundang Anda ke meeting grup`
              : `${senderName} mengundang Anda untuk bertemu`;

          // Jumlah peserta lain di group meeting (selain user yang login)
          const participantCount = Array.isArray(s.participants) ? s.participants.length : 0;

          return (
            <div key={key} className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="border-l-4 border-amber-400 p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">

                    {/* Badge Notifikasi */}
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${badgeStyle}`}>
                      <Info size={14} className="mr-1.5" />
                      {banner}
                    </div>

                    <h3 className="font-semibold text-slate-800 text-base">
                      {s.notes || "Jadwal Tanpa Judul"}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                      <span className="flex items-center">
                        <User size={14} className="mr-1.5 text-amber-500" />
                        Dari: <strong className="ml-1 text-slate-700">{senderName}</strong>
                      </span>
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1.5 text-slate-400" />
                        {formatDate(s.start_time)} — {formatDate(s.end_time)}
                      </span>
                      {kind === "PARTICIPANT" && participantCount > 1 && (
                        <span className="flex items-center">
                          <Users size={14} className="mr-1.5 text-blue-500" />
                          {participantCount} peserta diundang
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
                    <button
                      onClick={() => handleRespond(s.id, kind, "approve")}
                      disabled={isProcessing}
                      className="flex items-center px-3.5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-sm"
                    >
                      <CheckCircle size={16} className="mr-1.5" />
                      Terima
                    </button>
                    <button
                      onClick={() => handleRespond(s.id, kind, "reject")}
                      disabled={isProcessing}
                      className="flex items-center px-3.5 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                    >
                      <XCircle size={16} className="mr-1.5" />
                      Tolak
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
