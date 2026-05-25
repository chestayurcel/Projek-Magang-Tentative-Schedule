import { useEffect, useState } from "react";
import { X, Edit3, AlertTriangle } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface Props {
  isOpen: boolean;
  scheduleId: number | null;
  initial: {
    notes: string | null;
    start_time: string;
    end_time: string;
    category: "PRIBADI" | "UNIT" | "BERSAMA";
  } | null;
  onClose: () => void;
  onSaved: () => void; // dipanggil setelah sukses simpan / submit pengajuan
}

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "MANAJER", "ASISTEN_MANAJER"];

// Helper: format ISO → "YYYY-MM-DDTHH:mm" untuk <input type="datetime-local">
const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (val: string): string => new Date(val).toISOString();

export default function EditScheduleModal({ isOpen, scheduleId, initial, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const isManagement = !!user && MANAGEMENT_ROLES.includes(user.role);

  const [notes, setNotes] = useState("");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [category, setCategory] = useState<"PRIBADI" | "UNIT" | "BERSAMA">("PRIBADI");
  const [requestNote, setRequestNote] = useState(""); // alasan/keterangan utk pengajuan (staff)
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state dengan initial setiap kali modal dibuka
  useEffect(() => {
    if (isOpen && initial) {
      setNotes(initial.notes ?? "");
      setStartInput(toLocalInput(initial.start_time));
      setEndInput(toLocalInput(initial.end_time));
      setCategory(initial.category);
      setRequestNote("");
      setError(null);
    }
  }, [isOpen, initial]);

  if (!isOpen || !scheduleId || !initial) return null;

  const handleSubmit = async () => {
    if (!startInput || !endInput) {
      setError("Tanggal & jam mulai/selesai wajib diisi.");
      return;
    }
    if (new Date(startInput) >= new Date(endInput)) {
      setError("Waktu selesai harus setelah waktu mulai.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isManagement) {
        // Direct edit — eksekusi langsung
        const res = await api.put(`/schedules/${scheduleId}`, {
          notes,
          start_time: fromLocalInput(startInput),
          end_time: fromLocalInput(endInput),
          category,
        });
        alert(res.data?.message || "Jadwal berhasil diperbarui.");
      } else {
        // Staff/Supervisor → submit pengajuan EDIT
        if (!requestNote.trim()) {
          setError("Sertakan alasan/keterangan perubahan untuk atasan.");
          setIsSubmitting(false);
          return;
        }
        const res = await api.post(`/schedules/${scheduleId}/change-request`, {
          type: "EDIT",
          proposedNotes: notes,
          proposedStartTime: fromLocalInput(startInput),
          proposedEndTime: fromLocalInput(endInput),
          proposedCategory: category,
          requestNote,
        });
        alert(res.data?.message || "Pengajuan terkirim, menunggu review atasan.");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Gagal menyimpan perubahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Edit3 size={18} className="text-kai-blue" />
            <h3 className="text-base font-bold text-slate-800">
              {isManagement ? "Edit Jadwal" : "Ajukan Perubahan Jadwal"}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-md transition disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Banner role */}
        {!isManagement && (
          <div className="mx-5 mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Sebagai <strong>{user?.role?.replace("_", " ")}</strong>, perubahan ini akan dikirim sebagai <strong>pengajuan</strong> ke atasan untuk di-review. Jadwal asli tidak berubah sampai disetujui.
            </p>
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Keperluan / Judul</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Mulai</label>
              <input
                type="datetime-local"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Selesai</label>
              <input
                type="datetime-local"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                min={startInput || undefined}
                className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none bg-white transition"
            >
              <option value="PRIBADI">Pribadi</option>
              <option value="UNIT">Unit</option>
              <option value="BERSAMA">Bersama</option>
            </select>
          </div>

          {!isManagement && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Catatan untuk Atasan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Mis: Mohon geser ke 14:00 karena rapat darurat."
                rows={3}
                maxLength={500}
                className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition resize-none"
              />
              <p className="text-[10px] text-slate-400 text-right">{requestNote.length} / 500</p>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 px-2.5 py-2 rounded-lg">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-kai-blue hover:bg-[#1a2170] rounded-lg transition disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? "Menyimpan…" : isManagement ? "Simpan Langsung" : "Ajukan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
