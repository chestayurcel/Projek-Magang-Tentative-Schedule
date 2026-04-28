import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
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
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "MANAJER" || user?.role === "ASISTEN_MANAJER";

  useEffect(() => {
    if (isOpen) {
      api.get("/users/active")
        .then(res => setUsers(res.data))
        .catch(console.error);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      notes: form.get("notes") as string,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      category: category,
      target_user_id: form.get("target_user_id") || null,
    };

    try {
      const res = await api.post("/schedules", payload);
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.response?.data?.error || "Gagal membuat jadwal.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-kai-blue px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-bold tracking-wide flex items-center">
            <Plus size={20} className="mr-2" /> Tambah Jadwal Baru
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-md transition duration-200">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm font-medium">{error}</div>}

          <div className="space-y-1">
             <label className="text-sm font-medium text-slate-700">Keperluan / Judul</label>
             <input required name="notes" type="text" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition" placeholder="Misal: Rapat Evaluasi Bulanan" />
          </div>

          <div className="space-y-1">
             <label className="text-sm font-medium text-slate-700">Jenis Jadwal</label>
             <select name="category" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none bg-white transition">
                <option value="PRIBADI">Pribadi (Hanya Anda yang bisa melihat)</option>
                <option value="UNIT">Unit (Dilihat oleh rekan se-Unit)</option>
                <option value="BERSAMA">
                  {isAdmin 
                    ? "Bersama (Dilihat semua orang - Disetujui Otomatis)" 
                    : "Bersama (Dilihat semua orang - Butuh Persetujuan)"}
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

          <div className="space-y-1">
             <label className="text-sm font-medium text-slate-700">Pegawai/Target Undangan (Opsional)</label>
             <select name="target_user_id" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none bg-white transition">
                <option value="">-- Tidak Ada Target Personal --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role.replace("_", " ")})</option>
                ))}
             </select>
             <p className="text-xs text-slate-500">*Kosongkan jika ini acara pribadi Anda.</p>
          </div>

          <div className="flex justify-end pt-4 space-x-3 border-t border-slate-100">
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
