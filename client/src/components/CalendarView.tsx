import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { X, Calendar, Clock, User, Tag, CheckCircle2, AlertCircle, Users, ClipboardCheck, Edit3 } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface ParticipantInfo {
  id: number;
  name: string;
  nipp?: string;
  role?: string;
  status: string;
}

type RealizationStatus = "BELUM_DIISI" | "SESUAI" | "TIDAK_SESUAI";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    status: string;
    type: string;
    category: string;
    notes: string | null;
    creatorName: string | null;
    creatorId: number | null;
    guestName: string | null;
    unitName: string | null;
    participants: ParticipantInfo[];
    realizationStatus: RealizationStatus;
    realizationNotes: string | null;
    hasBeenRescheduled: boolean;
    startTimeIso: string;
    endTimeIso: string;
  };
}

interface CalendarViewProps {
  currentView: "PRIBADI" | "UNIT" | "BERSAMA" | "TIDAK_SESUAI";
  userId?: number;
}

// Helper: category badge styling
const categoryBadge = (category: string) => {
  switch (category) {
    case "BERSAMA":
      return { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500", label: "Bersama" };
    case "UNIT":
      return { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500", label: "Unit" };
    case "PRIBADI":
      return { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", label: "Pribadi" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500", label: category };
  }
};

// Helper: status badge styling
const statusBadge = (status: string) => {
  switch (status) {
    case "APPROVED":
      return { bg: "bg-green-100", text: "text-green-700", label: "Disetujui" };
    case "PENDING":
      return { bg: "bg-amber-100", text: "text-amber-700", label: "Menunggu" };
    case "RESCHEDULED":
      return { bg: "bg-orange-100", text: "text-orange-700", label: "Reschedule Diajukan" };
    case "REJECTED":
      return { bg: "bg-red-100", text: "text-red-700", label: "Ditolak" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-700", label: status };
  }
};

export default function CalendarView({ currentView, userId }: CalendarViewProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ===== Form realisasi (state form di dalam detail modal) =====
  const [realStatus, setRealStatus] = useState<RealizationStatus>("BELUM_DIISI");
  const [realNotes, setRealNotes] = useState("");
  const [isEditingReal, setIsEditingReal] = useState(false); // toggle edit kalau sudah pernah diisi
  const [isSavingReal, setIsSavingReal] = useState(false);
  const [realError, setRealError] = useState<string | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [currentView]);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/schedules`);
      let data = res.data;
      
      // Filter data di frontend berdasarkan tab
      if (currentView === "PRIBADI") {
         // "Jadwal Saya" = jadwal milik sendiri + target meeting single + peserta group meeting
         data = data.filter((s: any) =>
           s.user_id === userId
           || s.target_user_id === userId
           || (Array.isArray(s.participants) && s.participants.some((p: any) => (p.user?.id ?? p.userId) === userId))
         );
      } else if (currentView === "UNIT") {
         data = data.filter((s: any) => s.category === "UNIT");
      } else if (currentView === "BERSAMA") {
         data = data.filter((s: any) => s.category === "BERSAMA");
      } else if (currentView === "TIDAK_SESUAI") {
         // Monitoring: hanya jadwal yang dievaluasi 'Tidak Sesuai' DAN punya keterangan/alasan
         data = data.filter((s: any) =>
           s.realizationStatus === "TIDAK_SESUAI"
           && typeof s.realizationNotes === "string"
           && s.realizationNotes.trim().length > 0
         );
      }
      
      const mapped = data.map((s: any) => mapToCalendarEvent(s));
      setEvents(mapped);
    } catch (err) {
      console.error("Gagal memuat jadwal:", err);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const mapToCalendarEvent = (schedule: any): CalendarEvent => {
    const isGuest = schedule.type === "TAMU";

    // Hitung status efektif: untuk group meeting (punya participants), kalau
    // ada peserta yang belum APPROVE, anggap PENDING. Kalau ada yg RESCHEDULED,
    // anggap RESCHEDULED. Tujuan: visual kalender mencerminkan apakah undangan
    // sudah dikonfirmasi semua peserta.
    let effectiveStatus: string = schedule.status;
    if (Array.isArray(schedule.participants) && schedule.participants.length > 0) {
      const hasPending = schedule.participants.some((p: any) => p.status === "PENDING");
      const hasReschedule = schedule.participants.some((p: any) => p.status === "RESCHEDULED");
      if (hasPending) effectiveStatus = "PENDING";
      else if (hasReschedule) effectiveStatus = "RESCHEDULED";
    }

    // Skema warna berdasarkan jenis (warna solid untuk APPROVED)
    let bg = "#3b82f6"; // Biru default (Jadwal Bersama)
    let border = "#2563eb";

    if (isGuest) {
      bg = "#f59e0b";    // Kuning/Amber untuk Tamu
      border = "#d97706";
    } else if (schedule.category === "UNIT") {
      bg = "#8b5cf6";    // Ungu untuk Jadwal Unit
      border = "#7c3aed";
    } else if (schedule.category === "PRIBADI") {
      bg = "#10b981";    // Hijau untuk Jadwal Pribadi
      border = "#059669";
    }

    // Untuk status non-APPROVED, pakai warna transparan supaya visual jelas
    // jadwal masih tentative dan tidak terlihat seperti jadwal yang sudah pasti.
    if (effectiveStatus === "PENDING") {
      bg = "rgba(148, 163, 184, 0.45)";   // Abu-abu transparan utk Pending
      border = "rgba(100, 116, 139, 0.75)";
    } else if (effectiveStatus === "RESCHEDULED") {
      bg = "rgba(245, 158, 11, 0.45)";    // Amber transparan utk Reschedule request
      border = "rgba(217, 119, 6, 0.75)";
    } else if (effectiveStatus === "REJECTED") {
      bg = "rgba(239, 68, 68, 0.45)";     // Merah transparan utk Ditolak
      border = "rgba(220, 38, 38, 0.75)";
    }

    // Override khusus untuk tab "Jadwal Tidak Sesuai" — warna merah solid yang
    // sangat kontras supaya manajer langsung fokus melihat jadwal-jadwal yang
    // performanya bermasalah di lapangan.
    if (currentView === "TIDAK_SESUAI") {
      bg = "#dc2626";    // red-600 solid
      border = "#991b1b"; // red-900 solid
    }

    // Judul event
    let title = schedule.notes || "Jadwal";
    if (isGuest && schedule.guest) {
      title = `🤝 Tamu: ${schedule.guest.name}`;
    } else if (schedule.user) {
      title = schedule.notes || `Jadwal ${schedule.user.name}`;
    }

    // Map participants (jika ada) ke struktur ringkas yg dipakai modal detail
    const participants: ParticipantInfo[] = Array.isArray(schedule.participants)
      ? schedule.participants.map((p: any) => ({
          id: p.user?.id ?? p.userId,
          name: p.user?.name ?? "—",
          nipp: p.user?.nipp,
          role: p.user?.role,
          status: p.status,
        }))
      : [];

    return {
      id: String(schedule.id),
      title,
      start: schedule.start_time,
      end: schedule.end_time,
      backgroundColor: bg,
      borderColor: border,
      textColor: "#ffffff",
      extendedProps: {
        status: effectiveStatus,
        type: schedule.type,
        category: schedule.category,
        notes: schedule.notes,
        creatorName: schedule.user?.name || null,
        creatorId: schedule.user_id ?? schedule.user?.id ?? null,
        guestName: schedule.guest?.name || null,
        unitName: schedule.user?.unit?.unit_name || null,
        participants,
        realizationStatus: (schedule.realizationStatus || "BELUM_DIISI") as RealizationStatus,
        realizationNotes: schedule.realizationNotes ?? null,
        hasBeenRescheduled: !!schedule.hasBeenRescheduled,
        startTimeIso: schedule.start_time,
        endTimeIso: schedule.end_time,
      },
    };
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setIsEditingReal(false);
    setRealError(null);
  };

  // Saat event di-klik, isi state form realisasi dgn data existing
  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event);
    const ext = info.event.extendedProps;
    setRealStatus((ext.realizationStatus as RealizationStatus) || "BELUM_DIISI");
    setRealNotes(ext.realizationNotes || "");
    setIsEditingReal(false);
    setRealError(null);
    setIsModalOpen(true);
  };

  // Simpan realisasi ke backend
  const handleSaveRealization = async () => {
    if (!selectedEvent) return;
    if (realStatus === "BELUM_DIISI") {
      setRealError("Silakan pilih 'Sesuai' atau 'Tidak Sesuai' terlebih dahulu.");
      return;
    }
    setIsSavingReal(true);
    setRealError(null);
    try {
      const id = selectedEvent.id;
      const res = await api.put(`/schedules/${id}/realization`, {
        realizationStatus: realStatus,
        realizationNotes: realNotes,
      });
      const updated = res.data.schedule;

      // Update extendedProps di FullCalendar event
      selectedEvent.setExtendedProp("realizationStatus", updated.realizationStatus);
      selectedEvent.setExtendedProp("realizationNotes", updated.realizationNotes);

      // Sinkronkan juga ke state `events` lokal agar konsisten
      setEvents((prev) =>
        prev.map((e) =>
          e.id === String(id)
            ? {
                ...e,
                extendedProps: {
                  ...e.extendedProps,
                  realizationStatus: updated.realizationStatus,
                  realizationNotes: updated.realizationNotes,
                },
              }
            : e
        )
      );

      setIsEditingReal(false);
    } catch (err: any) {
      setRealError(err.response?.data?.error || "Gagal menyimpan realisasi.");
    } finally {
      setIsSavingReal(false);
    }
  };

  // Custom render untuk blok event di kalender
  const renderEventContent = (eventInfo: any) => {
    const start = eventInfo.event.start;
    const end = eventInfo.event.end;
    const unitName = eventInfo.event.extendedProps.unitName;

    const formatTime = (date: Date | null) => {
      if (!date) return "--:--";
      return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
    };

    const timeStr = `${formatTime(start)} - ${formatTime(end)}`;

    return (
      <div className="p-1 overflow-hidden text-xs leading-tight">
        <span className="font-bold whitespace-nowrap">{timeStr}</span>
        <br />
        {unitName && (
          <>
            <span className="font-semibold text-[10px] uppercase bg-white/20 px-1 rounded inline-block my-0.5">
              {unitName}
            </span>
            <br />
          </>
        )}
        <span className="truncate block">{eventInfo.event.title}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-blue"></div>
          <span className="ml-3 text-slate-500">Memuat kalender...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Legenda Warna — kontekstual berdasarkan tab aktif */}
        {currentView === "TIDAK_SESUAI" ? (
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
            <span className="inline-block w-3 h-3 rounded-full bg-[#dc2626] border border-[#991b1b]"></span>
            <p className="text-xs text-slate-600">
              Menampilkan jadwal yang dievaluasi <strong className="text-red-600">Tidak Sesuai</strong> oleh pemiliknya beserta keterangan kendalanya.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#3b82f6]"></span>
              <span className="text-xs text-slate-600">Bersama</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#8b5cf6]"></span>
              <span className="text-xs text-slate-600">Unit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
              <span className="text-xs text-slate-600">Pribadi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span>
              <span className="text-xs text-slate-600">Tamu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgba(148, 163, 184, 0.45)", border: "1px solid rgba(100,116,139,0.75)" }}></span>
              <span className="text-xs text-slate-600">Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgba(245, 158, 11, 0.45)", border: "1px solid rgba(217,119,6,0.75)" }}></span>
              <span className="text-xs text-slate-600">Reschedule</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgba(239, 68, 68, 0.45)", border: "1px solid rgba(220,38,38,0.75)" }}></span>
              <span className="text-xs text-slate-600">Ditolak</span>
            </div>
          </div>
        )}

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          locale="id"
          buttonText={{
            today: "Hari Ini",
            month: "Bulan",
            week: "Minggu",
            day: "Hari",
          }}
          events={events}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
          nowIndicator={true}
          eventContent={renderEventContent}
          eventClick={handleEventClick}
        />
      </div>

      {/* Custom Detail Modal */}
      {isModalOpen && selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#00529b] to-[#0F1551] px-6 py-4 flex justify-between items-start shrink-0">
              <div className="flex-1 mr-4">
                <h3 className="text-lg font-bold text-white leading-tight">
                  {selectedEvent.title}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  {(() => {
                    const cat = categoryBadge(selectedEvent.extendedProps.category);
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cat.bg} ${cat.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`}></span>
                        {cat.label}
                      </span>
                    );
                  })()}
                  {(() => {
                    const stat = statusBadge(selectedEvent.extendedProps.status);
                    return (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${stat.bg} ${stat.text}`}>
                        {selectedEvent.extendedProps.status === "APPROVED" ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertCircle size={12} />
                        )}
                        {stat.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all duration-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body — scrollable saat konten lebih tinggi dari viewport */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Waktu Pelaksanaan */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 rounded-lg bg-blue-50">
                  <Calendar size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Waktu Pelaksanaan</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {selectedEvent.start?.toLocaleDateString("id-ID", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-600">
                    <Clock size={13} className="text-slate-400" />
                    <span>
                      {selectedEvent.start?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      {" — "}
                      {selectedEvent.end?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pembuat */}
              {selectedEvent.extendedProps.creatorName && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-lg bg-emerald-50">
                    <User size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dibuat Oleh</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">
                      {selectedEvent.extendedProps.creatorName}
                      {selectedEvent.extendedProps.unitName && (
                        <span className="ml-2 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                          {selectedEvent.extendedProps.unitName}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Tamu */}
              {selectedEvent.extendedProps.guestName && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-lg bg-amber-50">
                    <User size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tamu</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">
                      {selectedEvent.extendedProps.guestName}
                    </p>
                  </div>
                </div>
              )}

              {/* Peserta (Group Meeting) */}
              {Array.isArray(selectedEvent.extendedProps.participants) &&
                selectedEvent.extendedProps.participants.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-lg bg-blue-50">
                      <Users size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Peserta ({selectedEvent.extendedProps.participants.length})
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {selectedEvent.extendedProps.participants.map((p: ParticipantInfo) => {
                          const statusStyle =
                            p.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : p.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700";
                          const statusLabel =
                            p.status === "APPROVED"
                              ? "Approved"
                              : p.status === "REJECTED"
                              ? "Rejected"
                              : "Pending";
                          return (
                            <li
                              key={p.id}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <span className="text-slate-700 truncate">
                                {p.name}
                                {p.nipp && (
                                  <span className="ml-1.5 text-xs text-slate-400">({p.nipp})</span>
                                )}
                              </span>
                              <span
                                className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle}`}
                              >
                                {statusLabel}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}

              {/* Catatan */}
              {selectedEvent.extendedProps.notes && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-lg bg-slate-100">
                    <Tag size={16} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catatan</p>
                    <p className="text-sm text-slate-700 mt-0.5 leading-relaxed">
                      {selectedEvent.extendedProps.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* ===== SECTION: REALISASI KEGIATAN ===== */}
              {(() => {
                const ext = selectedEvent.extendedProps;
                const isApproved = ext.status === "APPROVED";
                const eventEnded = ext.endTimeIso ? new Date(ext.endTimeIso) < new Date() : false;
                const isFilled = ext.realizationStatus && ext.realizationStatus !== "BELUM_DIISI";
                const isOwner = ext.creatorId != null && ext.creatorId === user?.id;
                const isManagement =
                  user?.role === "SUPER_ADMIN" ||
                  user?.role === "MANAJER" ||
                  user?.role === "ASISTEN_MANAJER";
                const canEdit = isOwner || isManagement;
                const canFillNow = isApproved && eventEnded && canEdit;

                let unavailableReason: string | null = null;
                if (!isApproved) unavailableReason = "Belum bisa diisi — jadwal belum APPROVED.";
                else if (!eventEnded) unavailableReason = "Belum bisa diisi — kegiatan belum selesai.";

                const realBadge = (s: string) => {
                  if (s === "SESUAI") return { bg: "bg-green-100", text: "text-green-700", label: "Sesuai" };
                  if (s === "TIDAK_SESUAI") return { bg: "bg-red-100", text: "text-red-700", label: "Tidak Sesuai" };
                  return { bg: "bg-slate-100", text: "text-slate-700", label: "Belum diisi" };
                };

                const showingResult = isFilled && !isEditingReal;
                const showingForm = canFillNow && (!isFilled || isEditingReal);

                return (
                  <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                    <div className="mt-0.5 p-2 rounded-lg bg-indigo-50">
                      <ClipboardCheck size={16} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Realisasi Kegiatan
                      </p>

                      {/* Kasus 1: Belum bisa diisi (PENDING / belum selesai) */}
                      {unavailableReason && (
                        <p className="text-sm text-slate-500 mt-1.5 italic">{unavailableReason}</p>
                      )}

                      {/* Kasus 2: Sudah diisi → tampilkan read-only result */}
                      {!unavailableReason && showingResult && (
                        <div className="mt-1.5 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {(() => {
                              const b = realBadge(ext.realizationStatus);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${b.bg} ${b.text}`}
                                >
                                  {ext.realizationStatus === "SESUAI" ? (
                                    <CheckCircle2 size={12} />
                                  ) : (
                                    <AlertCircle size={12} />
                                  )}
                                  {b.label}
                                </span>
                              );
                            })()}
                            {ext.hasBeenRescheduled && (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"
                                title="Jadwal ini sudah dibuatkan penggantinya"
                              >
                                <CheckCircle2 size={12} />
                                Sudah dijadwalkan ulang
                              </span>
                            )}
                          </div>
                          {ext.realizationNotes && (
                            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                              {ext.realizationNotes}
                            </p>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => setIsEditingReal(true)}
                              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-kai-blue transition-colors"
                            >
                              <Edit3 size={12} />
                              Ubah
                            </button>
                          )}
                        </div>
                      )}

                      {/* Kasus 3: Belum diisi / sedang edit & user punya hak → tampilkan form */}
                      {!unavailableReason && showingForm && (
                        <div className="mt-2 space-y-3">
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                              Status Pelaksanaan
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <label
                                className={`cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                                  realStatus === "SESUAI"
                                    ? "border-green-500 bg-green-50"
                                    : "border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="realStatus"
                                  value="SESUAI"
                                  checked={realStatus === "SESUAI"}
                                  onChange={() => setRealStatus("SESUAI")}
                                  className="sr-only"
                                />
                                <CheckCircle2
                                  size={14}
                                  className={realStatus === "SESUAI" ? "text-green-600" : "text-slate-400"}
                                />
                                <span
                                  className={`text-sm font-medium ${
                                    realStatus === "SESUAI" ? "text-green-700" : "text-slate-600"
                                  }`}
                                >
                                  Sesuai
                                </span>
                              </label>
                              <label
                                className={`cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                                  realStatus === "TIDAK_SESUAI"
                                    ? "border-red-500 bg-red-50"
                                    : "border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="realStatus"
                                  value="TIDAK_SESUAI"
                                  checked={realStatus === "TIDAK_SESUAI"}
                                  onChange={() => setRealStatus("TIDAK_SESUAI")}
                                  className="sr-only"
                                />
                                <AlertCircle
                                  size={14}
                                  className={
                                    realStatus === "TIDAK_SESUAI" ? "text-red-600" : "text-slate-400"
                                  }
                                />
                                <span
                                  className={`text-sm font-medium ${
                                    realStatus === "TIDAK_SESUAI" ? "text-red-700" : "text-slate-600"
                                  }`}
                                >
                                  Tidak Sesuai
                                </span>
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                              Keterangan / Catatan Realisasi
                            </label>
                            <textarea
                              value={realNotes}
                              onChange={(e) => setRealNotes(e.target.value)}
                              placeholder="Mis: Rapat berjalan lancar. / Hanya 3 dari 5 peserta hadir, agenda B tidak terbahas."
                              rows={3}
                              maxLength={1000}
                              className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition resize-none"
                            />
                            <p className="text-[10px] text-slate-400 mt-1 text-right">
                              {realNotes.length} / 1000
                            </p>
                          </div>

                          {realError && (
                            <div className="text-xs text-red-600 bg-red-50 border border-red-100 px-2.5 py-2 rounded-lg">
                              {realError}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSaveRealization}
                              disabled={isSavingReal}
                              className="flex items-center px-3.5 py-2 bg-kai-blue text-white text-sm font-medium rounded-lg hover:bg-[#1a2170] transition disabled:opacity-50 shadow-sm"
                            >
                              {isSavingReal ? "Menyimpan…" : "Simpan Realisasi"}
                            </button>
                            {isFilled && isEditingReal && (
                              <button
                                onClick={() => {
                                  setIsEditingReal(false);
                                  setRealStatus(ext.realizationStatus as RealizationStatus);
                                  setRealNotes(ext.realizationNotes || "");
                                  setRealError(null);
                                }}
                                disabled={isSavingReal}
                                className="flex items-center px-3.5 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
                              >
                                Batal
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Kasus 4: Sudah selesai & APPROVED tapi user tidak punya hak edit */}
                      {!unavailableReason && !showingResult && !showingForm && (
                        <p className="text-sm text-slate-500 mt-1.5 italic">
                          Belum diisi oleh pemilik jadwal.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <button
                onClick={handleCloseModal}
                className="w-full py-2.5 px-4 rounded-lg border-2 border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-100 hover:border-slate-400 transition-all duration-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
