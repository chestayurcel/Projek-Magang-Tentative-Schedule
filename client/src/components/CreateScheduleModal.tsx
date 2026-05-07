import { useState, useEffect } from "react";
import { X, Plus, User, Users, Briefcase } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateScheduleModal({ isOpen, onClose, onSuccess }: ModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [error, setError] = useState("");
  
  // New state for Action Type
  const [actionType, setActionType] = useState<'SELF' | 'MEETING' | 'DELEGATION'>('SELF');

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "MANAJER" || user?.role === "ASISTEN_MANAJER";

  useEffect(() => {
    if (isOpen) {
      api.get("/users/active")
        .then(res => setAllUsers(res.data.filter((u: any) => u.id !== user?.id))) // Exclude self
        .catch(console.error);
      setError("");
      setActionType('SELF'); // Reset
    }
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  // Filter users based on actionType
  const targetUsers = actionType === 'DELEGATION' 
    ? allUsers.filter(u => u.role === 'MANAJER' || u.role === 'ASISTEN_MANAJER')
    : allUsers;

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

    if (startTime < "08:00" || startTime > "16:00" || endTime < "08:00" || endTime > "16:00") {
      setError("Penambahan jadwal hanya dapat dilakukan pada jam kerja (08:00 - 16:00)");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      actionType,
      notes: form.get("notes") as string,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      category: category,
      target_user_id: actionType !== 'SELF' ? (form.get("target_user_id") || null) : null,
    };

    if (actionType !== 'SELF' && !payload.target_user_id) {
      setError("Silakan pilih target pegawai / atasan.");
      setIsSubmitting(false);
      return;
    }

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
                <span className={`text-xs font-semibold text-center ${actionType === 'MEETING' ? 'text-amber-600' : 'text-slate-600'}`}>Undang Pegawai Lain (Meeting)</span>
              </label>

              <label className={`cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${actionType === 'DELEGATION' ? 'border-purple-500 bg-purple-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="actionType" value="DELEGATION" className="sr-only" checked={actionType === 'DELEGATION'} onChange={() => setActionType('DELEGATION')} />
                <Briefcase size={24} className={`mb-1.5 ${actionType === 'DELEGATION' ? 'text-purple-500' : 'text-slate-400'}`} />
                <span className={`text-xs font-semibold text-center ${actionType === 'DELEGATION' ? 'text-purple-600' : 'text-slate-600'}`}>Buatkan Jadwal Atasan (Delegasi)</span>
              </label>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Form Utama */}
          <div className="space-y-4">
            {actionType !== 'SELF' && (
              <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <label className="text-sm font-bold text-slate-800">
                  {actionType === 'MEETING' ? 'Pilih Rekan Pegawai' : 'Pilih Atasan'}
                </label>
                <select name="target_user_id" required className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none bg-white transition">
                  <option value="">-- Pilih Pegawai --</option>
                  {targetUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role.replace("_", " ")})</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  *Jadwal ini akan masuk berstatus <strong className="text-amber-600">PENDING</strong> dan memerlukan persetujuan dari yang bersangkutan.
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
                  <option value="PRIBADI">Pribadi (Hanya terlihat di kalender pribadi)</option>
                  <option value="UNIT">Unit (Dilihat oleh rekan se-Unit)</option>
                  <option value="BERSAMA">
                    {isAdmin 
                      ? "Bersama (Dilihat semua orang - Disetujui Otomatis)" 
                      : "Bersama (Dilihat semua orang - Butuh Persetujuan Umum)"}
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
