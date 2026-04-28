"use client";

import { useState, useEffect } from "react";
import { createGuestSchedule, getActiveUsers } from "@/actions/schedule";

export default function GuestPage() {
  const [status, setStatus] = useState<"IDLE" | "LOADING" | "SUCCESS" | "ERROR">("IDLE");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    getActiveUsers().then(data => setUsers(data)).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("LOADING");
    try {
      const formData = new FormData(e.currentTarget);
      const res = await createGuestSchedule(formData);
      
      if (res.error) {
        setStatus("ERROR");
        setMessage(res.error);
      } else {
        setStatus("SUCCESS");
        setMessage("Permohonan kunjungan Anda telah berhasil dikirimkan! Mohon menunggu persetujuan dari Admin kami melalui email.");
      }
    } catch (err) {
       setStatus("ERROR");
       setMessage("Terjadi kesalahan sistem saat mencoba menghubungi server.");
    }
  };

  return (
    <div className="min-h-screen bg-kai-bg flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-kai-blue p-6 text-white text-center">
          <h1 className="text-2xl font-bold tracking-widest">KAI <span className="text-kai-orange">DAOP 6</span></h1>
          <p className="text-sm opacity-80 mt-1">Formulir Permohonan Kunjungan Tamu Resmi</p>
        </div>
        
        {status === "SUCCESS" ? (
          <div className="p-8 text-center bg-green-50 m-6 rounded-lg border border-green-200 text-green-800 font-medium leading-relaxed">
             {message}
             <button onClick={() => setStatus("IDLE")} className="mt-4 block mx-auto text-kai-blue underline text-sm hover:text-kai-orange">
                Kirim Permohonan Lainnya
             </button>
          </div>
        ) : (
          <form className="p-6 space-y-4" onSubmit={handleSubmit}>
            {status === "ERROR" && <div className="p-3 bg-red-50 text-red-600 rounded-md border border-red-100 text-sm font-medium">{message}</div>}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
                <input required name="name" type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-kai-blue focus:ring-1 focus:ring-kai-blue transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Alamat Email</label>
                <input required name="email" type="email" className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-kai-blue focus:ring-1 focus:ring-kai-blue transition-all" />
              </div>
            </div>

            <div className="space-y-1">
               <label className="text-sm font-medium text-slate-700">Nomor Telepon (Opsional)</label>
               <input name="phone" type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-kai-blue focus:ring-1 focus:ring-kai-blue transition-all" />
            </div>

            <div className="space-y-1">
               <label className="text-sm font-medium text-slate-700">Pegawai yang Ingin Ditemui (Opsional)</label>
               <select name="target_user_id" className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-kai-blue focus:ring-1 focus:ring-kai-blue transition-all text-sm">
                  <option value="">-- Pilih Pegawai atau Unit Tujuan --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role.replace("_", " ")})</option>
                  ))}
               </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Usulan Waktu Mulai</label>
                <input required name="start_time" type="datetime-local" className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-kai-blue focus:ring-1 focus:ring-kai-blue transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Usulan Waktu Selesai</label>
                <input required name="end_time" type="datetime-local" className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-kai-blue focus:ring-1 focus:ring-kai-blue transition-all" />
              </div>
            </div>

            <div className="space-y-1">
               <label className="text-sm font-medium text-slate-700">Tujuan Kunjungan Resmi</label>
               <textarea required name="purpose" rows={3} className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-kai-blue focus:ring-1 focus:ring-kai-blue transition-all placeholder:text-slate-400" placeholder="Silakan jabarkan keperluan dan agenda pertemuan..."></textarea>
            </div>

            <button disabled={status === "LOADING"} type="submit" className="w-full bg-kai-orange text-white py-3 rounded-md font-semibold hover:bg-[#d86600] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-4">
              {status === "LOADING" ? "Memproses Data..." : "Kirim Permohonan Kunjungan"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
