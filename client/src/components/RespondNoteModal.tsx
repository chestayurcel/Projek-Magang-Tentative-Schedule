import { useEffect, useState } from "react";
import { X, MessageSquare } from "lucide-react";

export type RespondAction = "reject" | "reschedule";

interface Props {
  isOpen: boolean;
  action: RespondAction | null;
  scheduleTitle?: string;
  isSubmitting?: boolean;
  onSubmit: (note: string) => void;
  onCancel: () => void;
}

/**
 * Modal kecil untuk meminta catatan/alasan saat user menolak atau
 * mengajukan reschedule sebuah undangan jadwal.
 */
export default function RespondNoteModal({
  isOpen,
  action,
  scheduleTitle,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: Props) {
  const [note, setNote] = useState("");

  // Reset textarea saat modal dibuka/ditutup
  useEffect(() => {
    if (isOpen) setNote("");
  }, [isOpen, action]);

  if (!isOpen || !action) return null;

  const isReject = action === "reject";
  const title = isReject ? "Tolak Undangan Jadwal" : "Ajukan Reschedule";
  const placeholder = isReject
    ? "Contoh: Maaf, saya ada agenda lain di jam tersebut."
    : "Contoh: Mohon geser ke jam 13:00 atau hari berikutnya.";
  const submitLabel = isReject ? "Tolak" : "Ajukan Reschedule";
  const accentBg = isReject ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className={isReject ? "text-red-500" : "text-amber-500"} />
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-md transition disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {scheduleTitle && (
            <p className="text-sm text-slate-600">
              Jadwal: <strong className="text-slate-800">{scheduleTitle}</strong>
            </p>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              {isReject ? "Alasan Penolakan (opsional)" : "Catatan / Usulan Waktu Baru"}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={placeholder}
              rows={4}
              maxLength={500}
              className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition resize-none"
              autoFocus
            />
            <p className="text-[10px] text-slate-400 mt-1 text-right">{note.length} / 500</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onSubmit(note.trim())}
            disabled={isSubmitting || (!isReject && note.trim().length === 0)}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition disabled:opacity-50 shadow-sm ${accentBg}`}
            title={!isReject && note.trim().length === 0 ? "Catatan wajib diisi untuk reschedule" : ""}
          >
            {isSubmitting ? "Mengirim…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
