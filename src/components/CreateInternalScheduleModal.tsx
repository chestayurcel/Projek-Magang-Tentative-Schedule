"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createInternalSchedule, getActiveUsers } from "@/actions/schedule";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateInternalScheduleModal({ isOpen, onClose, onSuccess }: ModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      getActiveUsers().then(data => setUsers(data)).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const res = await createInternalSchedule(formData);
    
    setIsSubmitting(false);

    if (res.error) {
      alert(res.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        
        <div className="bg-kai-blue px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-bold tracking-wide">Tambah Jadwal Baru</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-md transition duration-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
             <label className="text-sm font-medium text-slate-700">Keperluan / Judul</label>
             <input required name="notes" type="text" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-kai-blue outline-none" placeholder="Misal: Rapat Evaluasi Bulanan" />
          </div>

          <div className="space-y-1">
             <label className="text-sm font-medium text-slate-700">Jenis Jadwal</label>
             <select name="visibility" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-kai-blue outline-none bg-white">
                <option value="Pribadi">Pribadi (Disetujui Otomatis)</option>
                <option value="Keseluruhan">Keseluruhan (Bisa dilihat unit lain, Butuh Persetujuan Admin)</option>
             </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Waktu Mulai</label>
              <input required name="start_time" type="datetime-local" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-kai-blue outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Waktu Selesai</label>
              <input required name="end_time" type="datetime-local" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-kai-blue outline-none" />
            </div>
          </div>

          <div className="space-y-1">
             <label className="text-sm font-medium text-slate-700">Pilih Pegawai/Target Undangan (Opsional)</label>
             <select name="target_user_id" className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-kai-blue outline-none bg-white">
                <option value="">-- Tidak Ada Target Personal --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role.replace("_", " ")})</option>
                ))}
             </select>
             <p className="text-xs text-slate-500">*Kosongkan jika ini acara pribadi Anda.</p>
          </div>

          <div className="flex justify-end pt-4 space-x-3">
             <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded">
               Batal
             </button>
             <button disabled={isSubmitting} type="submit" className="px-4 py-2 font-medium bg-[#ff7900] hover:bg-[#e06900] text-white rounded disabled:opacity-50 transition-colors shadow-sm">
               {isSubmitting ? "Menyimpan..." : "Simpan Jadwal"}
             </button>
          </div>
        </form>

      </div>
    </div>
  );
}
