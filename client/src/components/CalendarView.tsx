import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { X, Calendar, Clock, User, Tag, CheckCircle2, AlertCircle, Users } from "lucide-react";
import api from "../lib/api";

interface ParticipantInfo {
  id: number;
  name: string;
  nipp?: string;
  role?: string;
  status: string;
}

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
    guestName: string | null;
    unitName: string | null;
    participants: ParticipantInfo[];
  };
}

interface CalendarViewProps {
  currentView: "PRIBADI" | "UNIT" | "BERSAMA";
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
    case "REJECTED":
      return { bg: "bg-red-100", text: "text-red-700", label: "Ditolak" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-700", label: status };
  }
};

export default function CalendarView({ currentView, userId }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
         data = data.filter((s: any) => s.user_id === userId || s.target_user_id === userId);
      } else if (currentView === "UNIT") {
         data = data.filter((s: any) => s.category === "UNIT");
      } else if (currentView === "BERSAMA") {
         data = data.filter((s: any) => s.category === "BERSAMA");
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

    // Skema warna berdasarkan jenis
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

    // Status non-APPROVED mendapat opacity lebih rendah
    if (schedule.status === "PENDING") {
      bg = "#94a3b8";    // Abu-abu untuk Pending
      border = "#64748b";
    } else if (schedule.status === "REJECTED") {
      bg = "#ef4444";    // Merah untuk Ditolak
      border = "#dc2626";
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
        status: schedule.status,
        type: schedule.type,
        category: schedule.category,
        notes: schedule.notes,
        creatorName: schedule.user?.name || null,
        guestName: schedule.guest?.name || null,
        unitName: schedule.user?.unit?.unit_name || null,
        participants,
      },
    };
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
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
        {/* Legenda Warna */}
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
            <span className="w-3 h-3 rounded-full bg-[#94a3b8]"></span>
            <span className="text-xs text-slate-600">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
            <span className="text-xs text-slate-600">Ditolak</span>
          </div>
        </div>

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
          eventClick={(info) => {
            setSelectedEvent(info.event);
            setIsModalOpen(true);
          }}
        />
      </div>

      {/* Custom Detail Modal */}
      {isModalOpen && selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#00529b] to-[#0F1551] px-6 py-4 flex justify-between items-start">
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

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
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
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
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
