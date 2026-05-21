import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, User, Calendar, Mail, Users, Info, RotateCw, Repeat } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import RespondNoteModal, { type RespondAction } from "../components/RespondNoteModal";

const frequencyLabel = (freq?: string | null): string | null => {
  if (!freq) return null;
  if (freq === "DAILY") return "Jadwal Rutin Harian";
  if (freq === "WEEKLY") return "Jadwal Rutin Mingguan";
  if (freq === "MONTHLY") return "Jadwal Rutin Bulanan";
  return "Jadwal Rutin";
};

export default function AdminSchedulesPage() {
  const { user } = useAuth();
  // Apakah user punya hak akses admin queue (`/schedules/pending`)
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "MANAJER" || user?.role === "ASISTEN_MANAJER";

  // Jadwal yang membutuhkan ADMIN approval (global queue, status PENDING)
  const [adminPending, setAdminPending] = useState<any[]>([]);
  // Undangan meeting (PARTICIPANT) yang menargetkan user yang sedang login
  const [myInvites, setMyInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Composite key (kind + id) supaya admin queue & personal invite tidak bentrok
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      // Selalu fetch incoming (semua role bisa)
      const incomingPromise = api.get("/schedules/incoming");

      // Fetch admin queue HANYA jika user adalah admin
      // (endpoint /schedules/pending require role SUPER_ADMIN/MANAJER/ASISTEN_MANAJER,
      //  jika dipanggil oleh staff/supervisor → 403 → interceptor auto-logout. Jangan!)
      const pendingPromise = isAdmin
        ? api.get("/schedules/pending")
        : Promise.resolve({ data: [] });

      const [pendingRes, incomingRes] = await Promise.all([pendingPromise, incomingPromise]);

      setAdminPending(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      // Hanya tarik kind=PARTICIPANT (group meeting invite). MEETING legacy &
      // DELEGATION sudah masuk ke /schedules/pending sehingga tidak perlu di-double.
      const incoming = Array.isArray(incomingRes.data) ? incomingRes.data : [];
      setMyInvites(incoming.filter((s: any) => s.kind === "PARTICIPANT"));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== Handler: Admin queue (PATCH /schedules/:id/approve|reject) =====
  const handleAdminApprove = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menyetujui jadwal ini?")) return;
    const key = `ADMIN-${id}`;
    setProcessing(key);
    try {
      await api.patch(`/schedules/${id}/approve`);
      setAdminPending(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || "Gagal menyetujui.");
    } finally {
      setProcessing(null);
    }
  };

  const handleAdminReject = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menolak jadwal ini?")) return;
    const key = `ADMIN-${id}`;
    setProcessing(key);
    try {
      await api.patch(`/schedules/${id}/reject`);
      setAdminPending(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || "Gagal menolak.");
    } finally {
      setProcessing(null);
    }
  };

  // ===== Handler: Personal invite (PATCH /schedules/:id/respond, kind=PARTICIPANT) =====
  // APPROVE: confirm langsung
  const handleInviteApprove = async (scheduleId: number) => {
    if (!confirm("Apakah Anda yakin ingin menerima undangan jadwal ini?")) return;
    const key = `INVITE-${scheduleId}`;
    setProcessing(key);
    try {
      const res = await api.patch(`/schedules/${scheduleId}/respond`, { action: "approve", kind: "PARTICIPANT" });
      alert(res.data.message);
      setMyInvites(prev => prev.filter(s => s.id !== scheduleId));
    } catch (err: any) {
      alert(err.response?.data?.error || "Gagal merespons.");
    } finally {
      setProcessing(null);
    }
  };

  // REJECT / RESCHEDULE: buka modal note
  const [noteModal, setNoteModal] = useState<{
    action: RespondAction;
    scheduleId: number;
    title: string;
  } | null>(null);

  const openInviteNoteModal = (action: RespondAction, scheduleId: number, title: string) => {
    setNoteModal({ action, scheduleId, title });
  };

  const submitInviteNote = async (note: string) => {
    if (!noteModal) return;
    const { action, scheduleId } = noteModal;
    const key = `INVITE-${scheduleId}`;
    setProcessing(key);
    try {
      const res = await api.patch(`/schedules/${scheduleId}/respond`, {
        action,
        kind: "PARTICIPANT",
        responseNote: note,
      });
      alert(res.data.message);
      setMyInvites(prev => prev.filter(s => s.id !== scheduleId));
      setNoteModal(null);
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-blue"></div>
        <span className="ml-3 text-slate-500">Memuat data...</span>
      </div>
    );
  }

  const totalInbox = adminPending.length + myInvites.length;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-bold text-kai-blue tracking-tight">Persetujuan Jadwal</h1>
        <p className="text-slate-500 mt-1">
          {isAdmin
            ? "Kelola undangan meeting Anda dan tinjau jadwal yang menunggu persetujuan admin."
            : "Kelola undangan meeting yang ditujukan kepada Anda."}
        </p>
      </div>

      {totalInbox === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <CheckCircle size={56} className="mx-auto text-green-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Semua Bersih!</h3>
          <p className="text-slate-500 mt-1">
            {isAdmin
              ? "Tidak ada undangan maupun jadwal yang menunggu persetujuan saat ini."
              : "Tidak ada undangan meeting yang menunggu respons Anda saat ini."}
          </p>
        </div>
      ) : (
        <>
          {/* ========== SECTION 1: UNDANGAN MEETING UNTUK ANDA ========== */}
          {myInvites.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-amber-500" />
                <h2 className="text-lg font-bold text-slate-800">
                  Undangan Meeting Untuk Anda
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                    {myInvites.length}
                  </span>
                </h2>
              </div>
              <p className="text-sm text-slate-500 -mt-1">
                Anda diundang sebagai peserta. Terima atau tolak undangan secara independen.
              </p>

              {myInvites.map((s) => {
                const key = `INVITE-${s.id}`;
                const isProcessing = processing === key;
                const senderName = s.user?.name || "—";
                const participantCount = Array.isArray(s.participants) ? s.participants.length : 0;

                return (
                  <div key={`invite-${s.id}`} className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="border-l-4 border-amber-400 p-5">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                            <Info size={14} className="mr-1.5" />
                            {senderName} mengundang Anda ke meeting grup
                          </div>

                          <h3 className="text-lg font-semibold text-slate-800 truncate">
                            {s.notes || "Jadwal Tanpa Judul"}
                          </h3>

                          {s.recurrenceGroupId && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200" title="Menyetujui satu kali akan berlaku untuk seluruh rangkaian">
                              <Repeat size={12} />
                              {frequencyLabel(s.recurrenceFrequency) || "Jadwal Rutin"}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                            <span className="flex items-center">
                              <User size={14} className="mr-1.5 text-amber-500" />
                              Dari: <strong className="ml-1 text-slate-700">{senderName}</strong>
                            </span>
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1.5 text-slate-400" />
                              {formatDate(s.start_time)} — {formatDate(s.end_time)}
                            </span>
                            {participantCount > 1 && (
                              <span className="flex items-center">
                                <Users size={14} className="mr-1.5 text-blue-500" />
                                {participantCount} peserta diundang
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                          <button
                            onClick={() => handleInviteApprove(s.id)}
                            disabled={isProcessing}
                            className="flex items-center px-3.5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-sm"
                          >
                            <CheckCircle size={16} className="mr-1.5" />
                            Terima
                          </button>
                          <button
                            onClick={() => openInviteNoteModal("reschedule", s.id, s.notes || "Jadwal Tanpa Judul")}
                            disabled={isProcessing}
                            className="flex items-center px-3.5 py-2 border border-amber-300 text-amber-700 bg-amber-50 text-sm font-medium rounded-lg hover:bg-amber-100 transition disabled:opacity-50"
                          >
                            <RotateCw size={16} className="mr-1.5" />
                            Reschedule
                          </button>
                          <button
                            onClick={() => openInviteNoteModal("reject", s.id, s.notes || "Jadwal Tanpa Judul")}
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
          )}

          {/* ========== SECTION 2: ADMIN QUEUE (Pending Schedule Approvals) ========== */}
          {adminPending.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-kai-blue" />
                <h2 className="text-lg font-bold text-slate-800">
                  Menunggu Persetujuan Admin
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {adminPending.length}
                  </span>
                </h2>
              </div>
              <p className="text-sm text-slate-500 -mt-1">
                Jadwal yang diajukan pegawai dan memerlukan persetujuan dari Anda sebagai admin.
              </p>

              {adminPending.map((s) => {
                const key = `ADMIN-${s.id}`;
                const isProcessing = processing === key;

                return (
                  <div key={`admin-${s.id}`} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
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
                            {s.category && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                s.category === "BERSAMA"
                                  ? "bg-blue-50 text-blue-700 border border-blue-100"
                                  : s.category === "UNIT"
                                  ? "bg-purple-50 text-purple-700 border border-purple-100"
                                  : "bg-green-50 text-green-700 border border-green-100"
                              }`}>
                                {s.category}
                              </span>
                            )}
                            {s.type === "TAMU" && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                                Tamu: {s.guest?.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4 shrink-0">
                          <button
                            onClick={() => handleAdminApprove(s.id)}
                            disabled={isProcessing}
                            className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-sm"
                          >
                            <CheckCircle size={16} className="mr-1.5" />
                            Setujui
                          </button>
                          <button
                            onClick={() => handleAdminReject(s.id)}
                            disabled={isProcessing}
                            className="flex items-center px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50"
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
          )}
        </>
      )}

      {/* Modal note untuk Reject & Reschedule pada Undangan Meeting */}
      <RespondNoteModal
        isOpen={noteModal !== null}
        action={noteModal?.action ?? null}
        scheduleTitle={noteModal?.title}
        isSubmitting={processing !== null}
        onSubmit={submitInviteNote}
        onCancel={() => setNoteModal(null)}
      />
    </div>
  );
}
