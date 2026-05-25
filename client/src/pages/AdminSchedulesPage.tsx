import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, User, Calendar, Mail, Users, Info, RotateCw, Repeat, Edit3, Trash2, FileEdit } from "lucide-react";
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
  // Pengajuan perubahan jadwal (EDIT / DELETE) dari bawahan (management only)
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
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
      const incomingPromise = api.get("/schedules/incoming");
      const pendingPromise = isAdmin ? api.get("/schedules/pending") : Promise.resolve({ data: [] });
      const changeReqPromise = isAdmin
        ? api.get("/schedules/change-requests/pending")
        : Promise.resolve({ data: [] });

      const [pendingRes, incomingRes, changeReqRes] = await Promise.all([
        pendingPromise, incomingPromise, changeReqPromise,
      ]);

      setAdminPending(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      const incoming = Array.isArray(incomingRes.data) ? incomingRes.data : [];
      setMyInvites(incoming.filter((s: any) => s.kind === "PARTICIPANT"));
      setChangeRequests(Array.isArray(changeReqRes.data) ? changeReqRes.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== Handler: Review change request =====
  const handleReviewChangeRequest = async (crId: number, action: "approve" | "reject") => {
    const label = action === "approve" ? "menyetujui" : "menolak";
    if (!confirm(`Anda yakin ingin ${label} pengajuan ini?`)) return;

    let reviewNote: string | null = null;
    if (action === "reject") {
      reviewNote = prompt("Alasan penolakan (opsional):") || null;
    }

    const key = `CR-${crId}`;
    setProcessing(key);
    try {
      const res = await api.patch(`/schedules/change-requests/${crId}/review`, {
        action,
        reviewNote,
      });
      alert(res.data?.message || "Berhasil diproses.");
      setChangeRequests((prev) => prev.filter((cr) => cr.id !== crId));
    } catch (err: any) {
      alert(err.response?.data?.error || "Gagal memproses pengajuan.");
    } finally {
      setProcessing(null);
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

  const totalInbox = adminPending.length + myInvites.length + changeRequests.length;

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

          {/* ========== SECTION 2: CHANGE REQUESTS (Edit/Delete pengajuan dari bawahan) ========== */}
          {changeRequests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileEdit size={18} className="text-rose-500" />
                <h2 className="text-lg font-bold text-slate-800">
                  Pengajuan Perubahan Jadwal
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                    {changeRequests.length}
                  </span>
                </h2>
              </div>
              <p className="text-sm text-slate-500 -mt-1">
                Permintaan Edit atau Hapus jadwal dari pegawai bawahan yang menunggu persetujuan Anda.
              </p>

              {changeRequests.map((cr: any) => {
                const key = `CR-${cr.id}`;
                const isProcessing = processing === key;
                const isEdit = cr.type === "EDIT";
                const accent = isEdit ? "border-blue-200 bg-blue-50/30 border-l-blue-500" : "border-red-200 bg-red-50/30 border-l-red-500";

                return (
                  <div key={cr.id} className={`bg-white rounded-xl shadow-sm border ${accent.split(" ").filter(c => c.startsWith("border-")).join(" ")} overflow-hidden hover:shadow-md transition-shadow`}>
                    <div className={`border-l-4 ${isEdit ? "border-l-blue-500" : "border-l-red-500"} p-5`}>
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${isEdit ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                            {isEdit ? <Edit3 size={14} className="mr-1.5" /> : <Trash2 size={14} className="mr-1.5" />}
                            {isEdit
                              ? `Pengajuan EDIT dari ${cr.requester?.name || "—"}`
                              : `Pengajuan HAPUS dari ${cr.requester?.name || "—"}`}
                          </div>

                          <h3 className="text-lg font-semibold text-slate-800 truncate">
                            {cr.schedule?.notes || "Jadwal Tanpa Judul"}
                          </h3>

                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                            <span className="flex items-center">
                              <User size={14} className="mr-1.5 text-slate-400" />
                              {cr.requester?.name} <span className="ml-1 text-xs text-slate-400">({cr.requester?.role?.replace("_", " ")})</span>
                            </span>
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1.5 text-slate-400" />
                              {formatDate(cr.schedule?.start_time)} — {formatDate(cr.schedule?.end_time)}
                            </span>
                            <span className="flex items-center">
                              <Clock size={14} className="mr-1.5 text-slate-400" />
                              Diajukan {formatDate(cr.createdAt)}
                            </span>
                          </div>

                          {/* Detail perubahan untuk EDIT */}
                          {isEdit && (
                            <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-xs">
                              <p className="font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Detail Perubahan:</p>
                              {cr.proposedNotes !== null && cr.proposedNotes !== cr.schedule?.notes && (
                                <p className="text-slate-700"><strong>Judul:</strong> "{cr.schedule?.notes || '-'}" → "{cr.proposedNotes}"</p>
                              )}
                              {cr.proposedStartTime && (
                                <p className="text-slate-700"><strong>Mulai:</strong> {formatDate(cr.schedule?.start_time)} → {formatDate(cr.proposedStartTime)}</p>
                              )}
                              {cr.proposedEndTime && (
                                <p className="text-slate-700"><strong>Selesai:</strong> {formatDate(cr.schedule?.end_time)} → {formatDate(cr.proposedEndTime)}</p>
                              )}
                              {cr.proposedCategory && cr.proposedCategory !== cr.schedule?.category && (
                                <p className="text-slate-700"><strong>Kategori:</strong> {cr.schedule?.category} → {cr.proposedCategory}</p>
                              )}
                            </div>
                          )}

                          {/* Alasan dari pengaju */}
                          {cr.requestNote && (
                            <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Alasan / Catatan Pengaju:</p>
                              <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{cr.requestNote}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
                          <button
                            onClick={() => handleReviewChangeRequest(cr.id, "approve")}
                            disabled={isProcessing}
                            className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-sm"
                          >
                            <CheckCircle size={16} className="mr-1.5" />
                            Terima
                          </button>
                          <button
                            onClick={() => handleReviewChangeRequest(cr.id, "reject")}
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

          {/* ========== SECTION 3: ADMIN QUEUE (Pending Schedule Approvals) ========== */}
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
