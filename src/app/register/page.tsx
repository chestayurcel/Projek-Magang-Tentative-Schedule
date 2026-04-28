"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUnits, registerUser } from "@/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [units, setUnits] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    getUnits().then(data => setUnits(data));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    const formData = new FormData(e.currentTarget);
    const res = await registerUser(formData);

    setIsSubmitting(false);

    if (res?.error) {
      setError(res.error);
    } else if (res?.success) {
      setSuccessMsg("Pendaftaran berhasil! Silakan tunggu persetujuan Admin sebelum dapat login.");
      
      // Auto-redirect ke login setelah 3 detik
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
        
        {/* Header Visuals */}
        <div className="bg-[#00529b] px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl -ml-8 -mb-8"></div>
          
          <div className="relative z-10 inline-flex justify-center items-center bg-white rounded-full px-4 py-1 mb-4 shadow-sm">
             <span className="text-[#00529b] font-black text-lg tracking-widest">KAI</span>
          </div>
          <h2 className="relative z-10 text-2xl font-bold text-white tracking-wide">Pendaftaran Pegawai</h2>
          <p className="relative z-10 text-blue-100 text-sm mt-1">Buat akun untuk mengakses Dasbor Jadwal</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 animate-in slide-in-from-top-2">
              {error}
            </div>
          )}
          
          {successMsg && (
            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm border border-green-200 animate-in slide-in-from-top-2 flex flex-col space-y-1">
              <span className="font-bold">Berhasil!</span>
              <span>{successMsg}</span>
              <span className="text-xs text-green-600 mt-2">Mengarahkan ke halaman login...</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">NIPP</label>
            <input required name="nipp" type="text" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00529b] outline-none text-sm transition" placeholder="Nomor Induk Pegawai" disabled={isSubmitting || successMsg !== ""} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
            <input required name="name" type="text" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00529b] outline-none text-sm transition" placeholder="Sesuai identitas resmi" disabled={isSubmitting || successMsg !== ""} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Email KAI</label>
            <input required name="email" type="email" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00529b] outline-none text-sm transition" placeholder="email@kai.id" disabled={isSubmitting || successMsg !== ""} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Kata Sandi</label>
            <input required name="password" type="password" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00529b] outline-none text-sm transition" placeholder="Minimal 6 karakter" disabled={isSubmitting || successMsg !== ""} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Asal Unit</label>
            <select required name="unit_id" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00529b] outline-none text-sm bg-white transition" disabled={isSubmitting || successMsg !== "" || units.length === 0}>
              <option value="">-- Pilih Divisi / Unit --</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.unit_name}</option>
              ))}
            </select>
            {units.length === 0 && <p className="text-xs text-slate-400 mt-1">Mengambil data unit...</p>}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || successMsg !== ""}
            className="w-full mt-6 py-3 bg-[#ff7900] text-white font-bold rounded-lg shadow-md hover:bg-[#e06900] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Memproses..." : "Daftar Akun"}
          </button>

          <div className="text-center pt-5 border-t border-slate-100 mt-6">
            <p className="text-sm text-slate-600">
              Sudah punya akun?{" "}
              <Link href="/login" className="text-[#00529b] font-semibold hover:underline">
                Login di sini
              </Link>
            </p>
          </div>
          
        </form>
      </div>
    </div>
  );
}
