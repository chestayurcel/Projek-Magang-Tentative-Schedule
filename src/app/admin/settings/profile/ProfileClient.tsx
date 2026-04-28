"use client";

import { useState } from "react";
import { updateProfile, changePassword } from "@/actions/profile";
import { Save, Lock, User, Mail, ShieldCheck } from "lucide-react";

interface ProfileClientProps {
  initialName: string;
  initialEmail: string;
}

export default function ProfileClient({ initialName, initialEmail }: ProfileClientProps) {
  // Profile State
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    const res = await updateProfile(name, email);
    setIsUpdatingProfile(false);
    
    if (res?.error) {
      alert(res.error);
    } else {
      alert("Profil berhasil diperbarui!");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return alert("Konfirmasi kata sandi tidak cocok!");
    }
    
    setIsChangingPassword(true);
    const res = await changePassword(oldPassword, newPassword);
    setIsChangingPassword(false);
    
    if (res?.error) {
      alert(res.error);
    } else {
      alert("Kata sandi berhasil diganti! Mohon gunakan kata sandi baru untuk login selanjutnya.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
      
      {/* Panel 1: Update Profil */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center space-x-2">
          <User className="text-kai-blue" size={20} />
          <h2 className="font-bold text-slate-800 text-lg">Informasi Dasar</h2>
        </div>
        <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center">
               <User size={14} className="mr-1.5 text-slate-400"/> Nama Lengkap
            </label>
            <input 
              required
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00529b] outline-none text-sm transition" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center">
               <Mail size={14} className="mr-1.5 text-slate-400"/> Alamat Email
            </label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00529b] outline-none text-sm transition" 
            />
          </div>
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isUpdatingProfile}
              className="flex items-center px-5 py-2.5 bg-kai-blue text-white font-medium rounded-lg hover:bg-blue-800 transition shadow-sm disabled:opacity-50"
            >
              <Save size={16} className="mr-2" />
              {isUpdatingProfile ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>

      {/* Panel 2: Ganti Password */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center space-x-2">
          <ShieldCheck className="text-[#ff7900]" size={20} />
          <h2 className="font-bold text-slate-800 text-lg">Keamanan Sandi</h2>
        </div>
        <form onSubmit={handleChangePassword} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center">
               <Lock size={14} className="mr-1.5 text-slate-400"/> Kata Sandi Lama
            </label>
            <input 
              required
              type="password" 
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Masukkan sandi saat ini"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ff7900] outline-none text-sm transition" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center">
               <Lock size={14} className="mr-1.5 text-slate-400"/> Kata Sandi Baru
            </label>
            <input 
              required
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ff7900] outline-none text-sm transition" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center">
               <Lock size={14} className="mr-1.5 text-slate-400"/> Konfirmasi Sandi Baru
            </label>
            <input 
              required
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi sandi baru"
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#ff7900] outline-none text-sm transition" 
            />
          </div>
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isChangingPassword}
              className="flex items-center px-5 py-2.5 bg-[#ff7900] text-white font-medium rounded-lg hover:bg-[#e06900] transition shadow-sm disabled:opacity-50"
            >
              <Save size={16} className="mr-2" />
              {isChangingPassword ? "Memvalidasi..." : "Ganti Kata Sandi"}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
