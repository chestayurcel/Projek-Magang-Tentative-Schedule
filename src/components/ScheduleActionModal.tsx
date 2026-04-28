"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { updateScheduleStatus } from "@/actions/schedule";
import { useSession } from "next-auth/react";

interface ScheduleData {
  id: number;
  title: string;
  type: string;
  status: string;
  notes: string | null;
  start_time: Date;
  end_time: Date;
  requesterName: string;
  requesterEmail: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleData | null;
  onSuccess: () => void;
}

export function ScheduleActionModal({ isOpen, onClose, schedule, onSuccess }: ModalProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  const [actionType, setActionType] = useState<"IDLE" | "REJECT" | "RESCHEDULE">("IDLE");
  const [reason, setReason] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !schedule) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    const res = await updateScheduleStatus(schedule.id, "APPROVED");
    setIsSubmitting(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) return alert("Harap isi alasan penolakan!");
    setIsSubmitting(true);
    const res = await updateScheduleStatus(schedule.id, "REJECTED", { reason });
    setIsSubmitting(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error);
    }
  };

  const handleReschedule = async () => {
    if (!newStart || !newEnd) return alert("Harap pilih waktu baru!");
    setIsSubmitting(true);
    const res = await updateScheduleStatus(schedule.id, "RESCHEDULED", {
      newStartTime: new Date(newStart),
      newEndTime: new Date(newEnd)
    });
    setIsSubmitting(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full', timeStyle: 'short'
    }).format(new Date(date));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-[#00529b] px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-bold tracking-wide">Detail Pengajuan Jadwal</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-md transition duration-200">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 border border-slate-100 rounded-lg space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-slate-500">Nama Pengaju:</span>
              <span className="col-span-2 font-semibold text-slate-800">{schedule.requesterName}</span>
              
              <span className="text-slate-500">Kontak:</span>
              <span className="col-span-2 text-slate-800">{schedule.requesterEmail}</span>
              
              <span className="text-slate-500">Jenis Jadwal:</span>
              <span className="col-span-2 text-kai-orange font-medium">{schedule.type}</span>
              
              <span className="text-slate-500 mt-2">Waktu Mulai:</span>
              <span className="col-span-2 mt-2 font-medium text-slate-800">{formatDate(schedule.start_time)}</span>
              
              <span className="text-slate-500">Waktu Selesai:</span>
              <span className="col-span-2 font-medium text-slate-800">{formatDate(schedule.end_time)}</span>

              <span className="text-slate-500 mt-2">Keperluan:</span>
              <span className="col-span-2 mt-2 text-slate-800 bg-white p-2 border border-slate-200 rounded">{schedule.notes || "-"}</span>
              
              <span className="text-slate-500 mt-2">Status Saat Ini:</span>
              <span className="col-span-2 mt-2 font-bold text-slate-700">{schedule.status}</span>
            </div>
          </div>

          {/* Dynamic Action Forms */}
          {actionType === "REJECT" && (
            <div className="space-y-3 animate-in slide-in-from-top-4 p-4 border border-red-200 bg-red-50 rounded-lg">
              <label className="text-sm font-medium text-red-800">Alasan Penolakan</label>
              <textarea 
                className="w-full p-2 border border-red-300 rounded focus:ring-1 focus:ring-red-400 outline-none text-sm" 
                rows={3} 
                onChange={(e) => setReason(e.target.value)} 
                value={reason}
                placeholder="Berikan alasan yang jelas..."
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => setActionType("IDLE")} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded">Batal</button>
                <button onClick={handleReject} disabled={isSubmitting} className="px-4 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 font-medium disabled:opacity-50">Konfirmasi Penolakan</button>
              </div>
            </div>
          )}

          {actionType === "RESCHEDULE" && (
            <div className="space-y-3 animate-in slide-in-from-top-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Pilih Waktu Baru (Reschedule)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-blue-800">Mulai Baru</label>
                  <input type="datetime-local" className="w-full text-sm p-1.5 border border-blue-300 rounded mt-1" onChange={e => setNewStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-blue-800">Selesai Baru</label>
                  <input type="datetime-local" className="w-full text-sm p-1.5 border border-blue-300 rounded mt-1" onChange={e => setNewEnd(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-2">
                <button onClick={() => setActionType("IDLE")} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded">Batal</button>
                <button onClick={handleReschedule} disabled={isSubmitting} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50">Simpan Waktu Baru</button>
              </div>
            </div>
          )}

          {/* Primary Action Buttons */}
          {actionType === "IDLE" && isAdmin && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <button onClick={() => setActionType("REJECT")} className="py-2 px-4 border border-red-500 text-red-600 rounded-md font-medium hover:bg-red-50 transition">
                Tolak
              </button>
              <button onClick={() => setActionType("RESCHEDULE")} className="py-2 px-4 border border-kai-orange text-kai-orange rounded-md font-medium hover:bg-orange-50 transition">
                Atur Ulang
              </button>
              <button disabled={isSubmitting} onClick={handleApprove} className="py-2 px-4 bg-[#00529b] text-white rounded-md font-semibold hover:bg-blue-800 transition disabled:opacity-50 shadow-sm">
                Setujui
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
