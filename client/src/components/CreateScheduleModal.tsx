import { useState, useEffect, useMemo } from "react";
import { X, Plus, User, Users, Briefcase, Search } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Bobot hierarki role — semakin tinggi angka, semakin senior posisinya.
// Dipakai untuk membatasi delegasi: user hanya boleh mendelegasi ke atasan
// (bobot >= bobot dirinya sendiri).
const roleWeight: Record<string, number> = {
  SUPER_ADMIN: 5,
  MANAJER: 4,
  ASISTEN_MANAJER: 3,
  SUPERVISOR: 2,
  STAFF: 1,
};

// Format role enum menjadi label yang mudah dibaca (Title Case)
const formatRole = (role: string): string => {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    MANAJER: "Manajer",
    ASISTEN_MANAJER: "Asisten Manajer",
    SUPERVISOR: "Supervisor",
    STAFF: "Staff",
  };
  return labels[role] || role.replace(/_/g, " ");
};

export default function CreateScheduleModal({ isOpen, onClose, onSuccess }: ModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [error, setError] = useState("");

  // Action Type & multi-select state utk group meeting
  const [actionType, setActionType] = useState<'SELF' | 'MEETING' | 'DELEGATION'>('SELF');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [meetingSearch, setMeetingSearch] = useState("");
  // Kategori jadwal & Judul/Keperluan — controlled agar bisa di-prefill saat user pilih "Jadwalkan Ulang"
  const [category, setCategory] = useState<'PRIBADI' | 'UNIT' | 'BERSAMA'>('PRIBADI');
  const [notes, setNotes] = useState("");

  // Daftar jadwal lampau berstatus TIDAK_SESUAI milik user (untuk fitur reschedule)
  const [tidakSesuaiList, setTidakSesuaiList] = useState<any[]>([]);
  const [selectedRescheduleId, setSelectedRescheduleId] = useState<string>("");

  // === Tanggal mulai & selesai (controlled, dengan auto-sync) ===
  // Default: kedua-duanya hari ini, karena mayoritas kegiatan selesai di hari yang sama.
  // User boleh override tanggal selesai untuk acara multi-hari (mis. dinas luar kota).
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // === Jadwal Berulang / Recurring ===
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  // Helper: format Date ke YYYY-MM-DD (untuk <input type="date" value=...>)
  const toDateInputValue = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "MANAJER" || user?.role === "ASISTEN_MANAJER";

  useEffect(() => {
    if (isOpen) {
      api.get("/users/active")
        .then(res => setAllUsers(res.data.filter((u: any) => u.id !== user?.id))) // Exclude self
        .catch(console.error);

      // Ambil daftar jadwal lampau "Tidak Sesuai" milik user
      api.get("/schedules/tidak-sesuai")
        .then(res => setTidakSesuaiList(Array.isArray(res.data) ? res.data : []))
        .catch(() => setTidakSesuaiList([]));

      setError("");
      setActionType('SELF'); // Reset
      setSelectedUserIds([]);
      setMeetingSearch("");
      setCategory('PRIBADI');
      setNotes("");
      setSelectedRescheduleId("");
      setIsRecurring(false);
      setRecurrenceFrequency('WEEKLY');
      setRecurrenceEndDate("");

      // Default tanggal mulai & selesai = hari ini (sebagian besar kegiatan
      // KAI diselesaikan di hari yang sama)
      const today = toDateInputValue(new Date());
      setStartDate(today);
      setEndDate(today);
    }
  }, [isOpen, user?.id]);

  // Handler: ketika tanggal mulai diubah, auto-sync tanggal selesai untuk
  // mengikuti. User tetap bisa override end_date secara manual setelah ini.
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    setEndDate(newStart);
  };

  // Handler dropdown "Jadwalkan Ulang" — auto-fill form berdasarkan jadwal lama
  const handleRescheduleSelect = (id: string) => {
    setSelectedRescheduleId(id);
    if (!id) {
      // User pilih "tidak, mulai dari kosong" → clear pre-fill
      setNotes("");
      setCategory('PRIBADI');
      return;
    }
    const found = tidakSesuaiList.find((s: any) => String(s.id) === id);
    if (found) {
      setNotes(found.notes || "");
      // Pastikan kategori valid (kalau PRIBADI tapi actionType bukan SELF, useEffect bawah akan reset ke UNIT)
      const cat = (found.category as 'PRIBADI' | 'UNIT' | 'BERSAMA') || 'PRIBADI';
      setCategory(cat);
    }
  };

  // Auto-reset kategori ke UNIT bila user pindah ke MEETING/DELEGATION
  // sementara kategori sebelumnya masih PRIBADI (yang tidak relevan utk acara berkelompok)
  useEffect(() => {
    if (actionType !== 'SELF' && category === 'PRIBADI') {
      setCategory('UNIT');
    }
  }, [actionType, category]);

  // Reset pilihan multi-select kalau pindah action type
  useEffect(() => {
    setSelectedUserIds([]);
    setMeetingSearch("");
  }, [actionType]);

  // Filter users based on actionType
  // PENTING: dihitung SEBELUM early-return supaya hook order stabil
  //
  // DELEGATION: terapkan hierarchy weight — user hanya boleh delegasi ke
  // pegawai yang bobotnya >= bobot dirinya sendiri (atasan atau setara).
  // `allUsers` sudah otomatis exclude diri sendiri saat fetch.
  const currentUserWeight = roleWeight[user?.role || ""] ?? 0;

  const targetUsers = actionType === 'DELEGATION'
    ? allUsers.filter((u: any) => (roleWeight[u.role] ?? 0) >= currentUserWeight)
    : allUsers;

  // Daftar utk checkbox list MEETING dengan filter pencarian
  // PENTING: useMemo HARUS dipanggil sebelum early-return agar urutan hook konsisten
  const filteredMeetingUsers = useMemo(() => {
    const q = meetingSearch.trim().toLowerCase();
    if (!q) return targetUsers;
    return targetUsers.filter((u: any) =>
      u.name?.toLowerCase().includes(q) ||
      u.nipp?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }, [targetUsers, meetingSearch]);

  // Early-return ditempatkan SETELAH semua hooks
  if (!isOpen) return null;

  const toggleParticipant = (id: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ===== Mass-invite helpers =====
  // Pilih HANYA user dengan role persis 'MANAJER' (tidak termasuk ASISTEN_MANAJER)
  const selectAllManagers = () => {
    const managerIds = allUsers
      .filter((u: any) => u.role === 'MANAJER')
      .map((u: any) => u.id);
    setSelectedUserIds(managerIds);
  };

  // Pilih semua pegawai aktif (sudah otomatis exclude diri sendiri saat fetch)
  const selectAllEmployees = () => {
    setSelectedUserIds(allUsers.map((u: any) => u.id));
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const category = form.get("category") as string;
    
    const startDate = form.get("start_date") as string;
    const startTime = form.get("start_time") as string;
    const endDate = form.get("end_date") as string;
    const endTime = form.get("end_time") as string;

    // Jam kerja kantor: 08:00 - 17:00. Jadwal di luar jam kerja diperbolehkan
    // dengan konfirmasi eksplisit dari user.
    const WORK_START = "08:00";
    const WORK_END = "17:00";
    const isOutsideWorkHours =
      startTime < WORK_START || startTime > WORK_END ||
      endTime < WORK_START || endTime > WORK_END;

    if (isOutsideWorkHours) {
      const proceed = window.confirm(
        `⚠️ Jadwal yang Anda buat berada di luar jam kerja kantor (${WORK_START} - ${WORK_END}).\n\n` +
        `Waktu jadwal: ${startTime} - ${endTime}\n\n` +
        `Apakah Anda yakin ingin tetap menambahkan jadwal ini?`
      );
      if (!proceed) {
        setIsSubmitting(false);
        return;
      }
    }

    const payload: any = {
      actionType,
      notes: form.get("notes") as string,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      category: category,
    };

    if (actionType === 'MEETING') {
      // Group meeting: multi-select participants
      if (selectedUserIds.length === 0) {
        setError("Silakan pilih minimal 1 pegawai untuk diundang.");
        setIsSubmitting(false);
        return;
      }
      payload.targetUserIds = selectedUserIds;
    } else if (actionType === 'DELEGATION') {
      // Delegasi: tetap single-select dari form (target_user_id)
      const tid = form.get("target_user_id");
      if (!tid) {
        setError("Silakan pilih atasan tujuan delegasi.");
        setIsSubmitting(false);
        return;
      }
      payload.target_user_id = tid;
    }
    // SELF: tidak perlu target

    // Kalau user pilih "Jadwalkan Ulang dari jadwal Tidak Sesuai", kirim ID-nya
    // supaya backend bisa menandai jadwal lama agar tidak muncul lagi di dropdown.
    if (selectedRescheduleId) {
      payload.rescheduleFromId = selectedRescheduleId;
    }

    // Recurring schedule fields
    if (isRecurring) {
      if (!recurrenceEndDate) {
        setError("Silakan isi Tanggal Berakhir untuk jadwal berulang.");
        setIsSubmitting(false);
        return;
      }
      if (recurrenceEndDate < startDate) {
        setError("Tanggal Berakhir jadwal berulang tidak boleh lebih awal dari Tanggal Mulai.");
        setIsSubmitting(false);
        return;
      }
      payload.isRecurring = true;
      payload.frequency = recurrenceFrequency;
      payload.recurrenceEndDate = recurrenceEndDate;
    }

    try {
      const res = await api.post("/schedules", payload);
      setIsSubmitting(false);
      // Untuk recurring, tampilkan info berapa jadwal yang berhasil dibuat
      if (isRecurring && res.data?.message) {
        alert(res.data.message);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.response?.data?.error || "Gagal membuat jadwal.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-kai-blue px-6 py-4 flex justify-between items-center text-white shrink-0">
          <h2 className="text-lg font-bold tracking-wide flex items-center">
            <Plus size={20} className="mr-2" /> Tambah Jadwal Baru
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-md transition duration-200">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm font-medium">{error}</div>}

          {/* === Reschedule dari Jadwal "Tidak Sesuai" === */}
          {tidakSesuaiList.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
              <label className="flex items-start gap-2 text-sm font-bold text-amber-800">
                <Search size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <span>Jadwalkan ulang kegiatan sebelumnya?</span>
              </label>
              <p className="text-[11px] text-amber-700/80 pl-6">
                Pilih kegiatan dari daftar — judul dan kategori akan terisi otomatis. Anda cukup mengatur tanggal dan jamnya.
              </p>
              <select
                value={selectedRescheduleId}
                onChange={(e) => handleRescheduleSelect(e.target.value)}
                className="w-full text-sm p-2.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white transition"
              >
                <option value="">— Tidak, mulai dari kosong —</option>
                {tidakSesuaiList.map((s: any) => {
                  const dateLabel = new Date(s.start_time).toLocaleDateString("id-ID", {
                    day: "2-digit", month: "short", year: "numeric",
                  });
                  const title = (s.notes || "(Tanpa judul)").trim();
                  return (
                    <option key={s.id} value={String(s.id)}>
                      {title} — {dateLabel}
                    </option>
                  );
                })}
              </select>
              {selectedRescheduleId && (() => {
                const found = tidakSesuaiList.find((s: any) => String(s.id) === selectedRescheduleId);
                if (!found?.realizationNotes) return null;
                return (
                  <div className="pl-6 text-[11px] text-amber-700/90 italic">
                    <strong className="not-italic">Catatan kendala sebelumnya:</strong> {found.realizationNotes}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Pemilihan Tujuan Jadwal (Action Type) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-800">Tujuan Jadwal</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${actionType === 'SELF' ? 'border-kai-blue bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="actionType" value="SELF" className="sr-only" checked={actionType === 'SELF'} onChange={() => setActionType('SELF')} />
                <User size={24} className={`mb-1.5 ${actionType === 'SELF' ? 'text-kai-blue' : 'text-slate-400'}`} />
                <span className={`text-xs font-semibold text-center ${actionType === 'SELF' ? 'text-kai-blue' : 'text-slate-600'}`}>Untuk Saya Sendiri</span>
              </label>

              <label className={`cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${actionType === 'MEETING' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="actionType" value="MEETING" className="sr-only" checked={actionType === 'MEETING'} onChange={() => setActionType('MEETING')} />
                <Users size={24} className={`mb-1.5 ${actionType === 'MEETING' ? 'text-amber-500' : 'text-slate-400'}`} />
                <span className={`text-xs font-semibold text-center ${actionType === 'MEETING' ? 'text-amber-600' : 'text-slate-600'}`}>Undang Pegawai Lain</span>
              </label>

              <label className={`cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${actionType === 'DELEGATION' ? 'border-purple-500 bg-purple-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="actionType" value="DELEGATION" className="sr-only" checked={actionType === 'DELEGATION'} onChange={() => setActionType('DELEGATION')} />
                <Briefcase size={24} className={`mb-1.5 ${actionType === 'DELEGATION' ? 'text-purple-500' : 'text-slate-400'}`} />
                <span className={`text-xs font-semibold text-center ${actionType === 'DELEGATION' ? 'text-purple-600' : 'text-slate-600'}`}>Buatkan Jadwal Atasan</span>
              </label>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Form Utama */}
          <div className="space-y-4">
            {/* DELEGATION → single select (1 atasan, hanya hierarki >= dirinya) */}
            {actionType === 'DELEGATION' && (
              <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <label className="text-sm font-bold text-slate-800">Pilih Atasan</label>
                <select name="target_user_id" required className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none bg-white transition">
                  <option value="">-- Pilih Atasan --</option>
                  {targetUsers.length === 0 ? (
                    <option value="" disabled>Tidak ada atasan yang dapat didelegasikan.</option>
                  ) : (
                    targetUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name} - {formatRole(u.role)}</option>
                    ))
                  )}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  *Jadwal ini akan masuk berstatus <strong className="text-amber-600">PENDING</strong> dan memerlukan persetujuan dari yang bersangkutan.
                </p>
              </div>
            )}

            {/* MEETING → multi-select checkbox list (group meeting) */}
            {actionType === 'MEETING' && (
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-800">Undang Pegawai (Bisa Lebih dari 1)</label>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selectedUserIds.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                    {selectedUserIds.length} terpilih
                  </span>
                </div>

                {/* Mass-invite quick pills */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllManagers}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                  >
                    Pilih Semua Manajer
                  </button>
                  <button
                    type="button"
                    onClick={selectAllEmployees}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                  >
                    Pilih Semua Pegawai
                  </button>
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition"
                    >
                      Bersihkan Pilihan
                    </button>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={meetingSearch}
                    onChange={(e) => setMeetingSearch(e.target.value)}
                    placeholder="Cari nama, NIPP, atau jabatan…"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none bg-white transition"
                  />
                </div>

                {/* Checkbox list */}
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                  {filteredMeetingUsers.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center italic">
                      {meetingSearch ? "Tidak ada pegawai yang cocok." : "Tidak ada pegawai aktif."}
                    </div>
                  ) : (
                    filteredMeetingUsers.map((u: any) => {
                      const checked = selectedUserIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 transition ${checked ? 'bg-amber-50/50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParticipant(u.id)}
                            className="w-4 h-4 rounded border-slate-300 text-kai-orange focus:ring-kai-orange"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {u.nipp} · {u.role?.replace("_", " ")}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Selected chips */}
                {selectedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedUserIds.map((id) => {
                      const u = allUsers.find((x) => x.id === id);
                      if (!u) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium"
                        >
                          {u.name}
                          <button
                            type="button"
                            onClick={() => toggleParticipant(id)}
                            className="hover:bg-amber-200 rounded-full p-0.5 transition"
                            aria-label={`Hapus ${u.name}`}
                          >
                            <X size={10} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  *Setiap pegawai akan menerima undangan dengan status <strong className="text-amber-600">PENDING</strong> dan dapat menerima/menolak secara independen.
                </p>
              </div>
            )}

            <div className="space-y-1">
               <label className="text-sm font-medium text-slate-700">Keperluan / Judul</label>
               <input
                 required
                 name="notes"
                 type="text"
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
                 className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition"
                 placeholder="Misal: Rapat Evaluasi Bulanan"
               />
            </div>

            <div className="space-y-1">
               <label className="text-sm font-medium text-slate-700">Jenis Jadwal</label>
               <select
                 name="category"
                 value={category}
                 onChange={(e) => setCategory(e.target.value as 'PRIBADI' | 'UNIT' | 'BERSAMA')}
                 className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none bg-white transition"
               >
                  {/* PRIBADI hanya muncul saat jadwal untuk diri sendiri */}
                  {actionType === 'SELF' && (
                    <option value="PRIBADI">Pribadi</option>
                  )}
                  <option value="UNIT">Unit</option>
                  <option value="BERSAMA">
                    {isAdmin
                      ? "Bersama"
                      : "Bersama (Butuh Persetujuan Atasan)"}
                  </option>
               </select>
               {actionType !== 'SELF' && (
                 <p className="text-xs text-slate-500 mt-1">
                   *Jadwal yang melibatkan orang lain hanya bisa berkategori <strong>Unit</strong> atau <strong>Bersama</strong>.
                 </p>
               )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Tanggal Mulai</label>
                <input
                  required
                  name="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Jam Mulai</label>
                <input required name="start_time" type="time" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Tanggal Selesai</label>
                <input
                  required
                  name="end_date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Jam Selesai</label>
                <input required name="end_time" type="time" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition" />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Jam kerja: <span className="font-semibold text-slate-700">08:00–17:00</span>. Di luar jam tersebut tetap bisa, hanya perlu konfirmasi sebelum disimpan.
            </p>

            {/* === Jadwal Berulang / Recurring === */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-kai-blue focus:ring-kai-blue"
                />
                <span className="text-sm font-semibold text-slate-800">Jadwal Berulang?</span>
                <span className="text-[11px] text-slate-500">(buat banyak jadwal sekaligus secara rutin)</span>
              </label>

              {isRecurring && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Frekuensi</label>
                    <select
                      value={recurrenceFrequency}
                      onChange={(e) => setRecurrenceFrequency(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')}
                      className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none bg-white transition"
                    >
                      <option value="DAILY">Harian</option>
                      <option value="WEEKLY">Mingguan</option>
                      <option value="MONTHLY">Bulanan</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Tanggal Berakhir</label>
                    <input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 sm:col-span-2 italic">
                    Jadwal akan diulang secara otomatis dari Tanggal Mulai sampai Tanggal Berakhir. Maksimal 100 kejadian. Setiap kejadian bersifat mandiri (persetujuan / reschedule / realisasi per tanggal).
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-5 space-x-3 border-t border-slate-100">
             <button type="button" onClick={onClose} className="px-4 py-2.5 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
               Batal
             </button>
             <button disabled={isSubmitting} type="submit" className="px-5 py-2.5 font-medium bg-[#ff7900] hover:bg-[#e06900] text-white rounded-lg disabled:opacity-50 transition-colors shadow-sm">
               {isSubmitting ? "Menyimpan..." : "Simpan Jadwal"}
             </button>
          </div>
        </form>

      </div>
    </div>
  );
}
