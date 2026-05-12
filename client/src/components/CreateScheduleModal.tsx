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

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "MANAJER" || user?.role === "ASISTEN_MANAJER";

  useEffect(() => {
    if (isOpen) {
      api.get("/users/active")
        .then(res => setAllUsers(res.data.filter((u: any) => u.id !== user?.id))) // Exclude self
        .catch(console.error);
      setError("");
      setActionType('SELF'); // Reset
      setSelectedUserIds([]);
      setMeetingSearch("");
    }
  }, [isOpen, user?.id]);

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

    try {
      await api.post("/schedules", payload);
      setIsSubmitting(false);
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
               <input required name="notes" type="text" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition" placeholder="Misal: Rapat Evaluasi Bulanan" />
            </div>

            <div className="space-y-1">
               <label className="text-sm font-medium text-slate-700">Jenis Jadwal</label>
               <select name="category" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none bg-white transition">
                  <option value="PRIBADI">Pribadi</option>
                  <option value="UNIT">Unit</option>
                  <option value="BERSAMA">
                    {isAdmin 
                      ? "Bersama"
                      : "Bersama (Butuh Persetujuan Atasan)"}
                  </option>
               </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Tanggal Mulai</label>
                <input required name="start_date" type="date" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Jam Mulai</label>
                <input required name="start_time" type="time" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Tanggal Selesai</label>
                <input required name="end_date" type="date" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Jam Selesai</label>
                <input required name="end_time" type="time" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition" />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Jam kerja kantor: <span className="font-semibold text-slate-700">08:00 - 17:00</span>. Jadwal di luar jam kerja boleh, namun akan diminta konfirmasi terlebih dahulu.
            </p>
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
