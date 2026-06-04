import { useState, useEffect, useRef } from "react";
import { Bell, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../lib/api";

/**
 * Lonceng notifikasi global di Navbar.
 * Menampilkan jumlah undangan/delegasi jadwal yang masih PENDING untuk
 * user yang sedang login (sumber data: GET /schedules/incoming — sama
 * dengan widget IncomingSchedules di Dashboard).
 *
 * Berjalan berdampingan dengan widget Dashboard, bukan menggantikannya.
 */
export default function NotificationBell() {
  const [pendingSchedules, setPendingSchedules] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch saat mount
  useEffect(() => {
    fetchPending();
  }, []);

  // Refresh data setiap kali dropdown dibuka (agar sync dengan widget Dashboard)
  useEffect(() => {
    if (isDropdownOpen) fetchPending();
  }, [isDropdownOpen]);

  // Click-outside to close dropdown
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isDropdownOpen]);

  const fetchPending = async () => {
    try {
      const res = await api.get("/schedules/incoming");
      setPendingSchedules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Gagal memuat notifikasi:", err);
    }
  };

  // Format teks pesan per jenis notifikasi
  const messageFor = (s: any): string => {
    const title = s.notes || "Jadwal Tanpa Judul";
    if (s.participantStatus === "RESCHEDULED") return `Reschedule diajukan untuk: ${title}`;
    if (s.kind === "DELEGATION") return `Pengajuan delegasi jadwal: ${title}`;
    return `Ada undangan meeting: ${title}`;
  };

  // Label frekuensi untuk badge "Jadwal Rutin"
  const frequencyLabel = (freq?: string | null): string | null => {
    if (!freq) return null;
    if (freq === "DAILY") return "Rutin Harian";
    if (freq === "WEEKLY") return "Rutin Mingguan";
    if (freq === "MONTHLY") return "Rutin Bulanan";
    return "Rutin";
  };

  const senderFor = (s: any): string => {
    if (s.kind === "DELEGATION") return s.creator?.name || "—";
    return s.user?.name || "—";
  };

  const totalCount = pendingSchedules.length;
  const topItems = pendingSchedules.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* === Tombol Lonceng + Badge === */}
      <button
        type="button"
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className="relative p-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
        aria-label="Notifikasi"
        aria-expanded={isDropdownOpen}
      >
        <Bell size={20} className="text-slate-600" />
        {totalCount > 0 && (
          <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm ring-2 ring-white">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {/* === Dropdown === */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-800">Notifikasi</h3>
            {totalCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                {totalCount} baru
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {totalCount === 0 ? (
              <div className="px-4 py-10 text-center">
                <Inbox size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Tidak ada notifikasi baru.</p>
              </div>
            ) : (
              topItems.map((s) => (
                <div
                  key={`${s.kind || "MEETING"}-${s.id}`}
                  className="px-4 py-3 hover:bg-slate-50/70 transition-colors"
                >
                  <p className="text-sm text-slate-700 leading-snug">
                    {messageFor(s)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-xs text-slate-400">
                      Dari <span className="font-medium text-slate-600">{senderFor(s)}</span>
                    </p>
                    {s.recurrenceGroupId && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {frequencyLabel(s.recurrenceFrequency) || "Rutin"}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Link */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
            <Link
              to="/admin/schedules"
              onClick={() => setIsDropdownOpen(false)}
              className="text-xs font-semibold text-kai-blue hover:underline inline-flex items-center"
            >
              Lihat semua persetujuan di menu Persetujuan Jadwal
              <span className="ml-1">→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
