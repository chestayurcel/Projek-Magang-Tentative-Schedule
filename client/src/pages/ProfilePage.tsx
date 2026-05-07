import { useState, useEffect } from "react";
import { Shield, Key, User, Briefcase, Building, Mail, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import api from "../lib/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/users/profile");
      setProfile(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Konfirmasi password baru tidak cocok." });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password baru minimal 6 karakter." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.put("/users/update-password", { oldPassword, newPassword });
      setMessage({ type: "success", text: res.data.message });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.error || "Gagal memperbarui password." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Memuat profil...</div>;
  if (!profile) return <div className="p-8 text-center text-red-500">Gagal memuat profil.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Shield className="text-kai-orange" size={28} />
        <h1 className="text-2xl font-bold text-slate-800">Keamanan & Profil</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kolom Kiri: Profil Read-Only */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center">
            <User className="text-kai-blue mr-2" size={20} />
            <h2 className="font-semibold text-slate-800">Informasi Pribadi</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center mb-1">
                <CreditCard size={14} className="mr-1.5" /> NIPP
              </label>
              <div className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-100 break-words whitespace-normal min-h-[44px]">{profile.nipp}</div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center mb-1">
                <User size={14} className="mr-1.5" /> Nama Lengkap
              </label>
              <div className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-100 break-words whitespace-normal min-h-[44px]">{profile.name}</div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center mb-1">
                <Mail size={14} className="mr-1.5" /> Email
              </label>
              <div className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-100 break-words whitespace-normal min-h-[44px]">{profile.email}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center mb-1">
                  <Briefcase size={14} className="mr-1.5" /> Jabatan / Role
                </label>
                <div className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-100 break-words whitespace-normal min-h-[44px]">
                  {profile.jabatan || profile.role.replace("_", " ")}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center mb-1">
                  <Building size={14} className="mr-1.5" /> Unit Kerja
                </label>
                <div className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-100 break-words whitespace-normal min-h-[44px]">
                  {profile.unit?.unit_name || "-"}
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <p className="text-xs text-slate-400 italic">
                * Hubungi Administrator jika terdapat kesalahan pada informasi profil Anda.
              </p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Ganti Password */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center">
            <Key className="text-kai-orange mr-2" size={20} />
            <h2 className="font-semibold text-slate-800">Ganti Password</h2>
          </div>
          
          <form onSubmit={handlePasswordUpdate} className="p-6 space-y-5">
            {message && (
              <div className={`p-4 rounded-lg flex items-start space-x-3 text-sm font-medium border ${
                message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {message.type === 'success' ? <CheckCircle size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">Password Lama</label>
              <input 
                type="password" 
                required 
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition" 
                placeholder="Masukkan password lama Anda"
              />
            </div>

            <hr className="border-slate-100 my-4" />

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">Password Baru</label>
              <input 
                type="password" 
                required 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition" 
                placeholder="Minimal 6 karakter"
                minLength={6}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">Konfirmasi Password Baru</label>
              <input 
                type="password" 
                required 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition" 
                placeholder="Ulangi password baru"
                minLength={6}
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-2.5 bg-kai-blue hover:bg-[#0a0d36] text-white font-medium rounded-lg disabled:opacity-50 transition shadow-sm flex items-center justify-center"
              >
                {isSubmitting ? "Menyimpan..." : "Perbarui Password"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
