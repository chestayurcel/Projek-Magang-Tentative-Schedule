"use client";

import { useSession } from "next-auth/react";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import idLocale from "@fullcalendar/core/locales/id";
import { getSchedules } from "@/actions/schedule";
import { ScheduleActionModal } from "./ScheduleActionModal";
import { CreateInternalScheduleModal } from "./CreateInternalScheduleModal";

interface CalendarViewProps {
  currentView: "GLOBAL" | "MY";
}

export function CalendarView({ currentView }: CalendarViewProps) {
  const { data: session } = useSession();
  const myId = parseInt(session?.user?.id || "0");
  
  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);

  const fetchEvents = async () => {
    try {
      const data = await getSchedules(currentView);
      
      const mappedEvents = data.map((schedule: any) => {
        let title = schedule.type === "TAMU" && schedule.guest 
          ? `Tamu: ${schedule.guest.name}`
          : `Internal: ${schedule.user?.name || "Pegawai"}`;

        let borderColor = "transparent";

        if (currentView === "MY") {
          const isCreator = schedule.user_id === myId;
          const isTarget = schedule.target_user_id === myId;
          
          if (isCreator && isTarget) {
            title = `📌 PRIBADI - ${title}`;
          } else if (isTarget) {
            title = `🎯 UNDANGAN - ${title}`;
            borderColor = "#ff7900"; // Oranye KAI border untuk undangan
          } else if (isCreator) {
            title = `✍️ SAYA BUAT - ${title}`;
          }
        }

        let bgColor = "#00529b"; // APPROVED
        if (schedule.status === "PENDING") bgColor = "#eab308";
        else if (schedule.status === "REJECTED") bgColor = "#ef4444";
        else if (schedule.status === "RESCHEDULED") bgColor = "#3B82F6";

        return {
          id: schedule.id.toString(),
          title: title,
          start: schedule.start_time,
          end: schedule.end_time,
          backgroundColor: bgColor,
          borderColor: borderColor,
          extendedProps: {
            rawSchedule: schedule
          }
        };
      });

      setEvents(mappedEvents);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentView]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 relative">
      <div className="mb-4 flex justify-end">
        <button 
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-[#ff7900] text-white font-medium rounded-md hover:bg-[#e06900] transition shadow-sm"
        >
          + Tambah Jadwal
        </button>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locale={idLocale}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay"
        }}
        buttonText={{
          today: "Hari Ini",
          month: "Bulan",
          week: "Minggu",
          day: "Hari"
        }}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        events={events}
        height="75vh"
        eventClick={(info) => {
          const raw = info.event.extendedProps.rawSchedule;
          setSelectedSchedule({
            id: raw.id,
            title: info.event.title,
            type: raw.type,
            status: raw.status,
            notes: raw.notes || raw.guest?.purpose, // Fallback ke guest purpose untuk permohonan lama
            start_time: raw.start_time,
            end_time: raw.end_time,
            requesterName: raw.type === "TAMU" ? raw.guest?.name : raw.user?.name,
            requesterEmail: raw.type === "TAMU" ? raw.guest?.email : raw.user?.email,
          });
          setModalOpen(true);
        }}
      />

      <ScheduleActionModal 
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        schedule={selectedSchedule}
        onSuccess={() => fetchEvents()}
      />

      <CreateInternalScheduleModal 
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => fetchEvents()}
      />
    </div>
  );
}
