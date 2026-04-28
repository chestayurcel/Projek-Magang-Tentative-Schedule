import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Building, CheckCircle, Shield } from "lucide-react";
import api from "../lib/api";

interface Unit {
  id: number;
  unit_name: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Fetch daftar unit (public)
    api.get("/units")
      .then(res => setUnits(res.data))
      .catch(err => console.error("Gagal mengambil data unit:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries((formData as any).entries());

    try {
      await api.post("/auth/register", payload);
      setSuccess(true);
      // Tunggu 5 detik lalu redirect ke login
      setTimeout(() => {
        navigate("/login");
      }, 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Terjadi kesalahan saat pendaftaran.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center bg-fixed">
      <div className="absolute inset-0 bg-[#0c1040]/80 backdrop-blur-sm"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          KAI <span className="text-[#ff7900]">DAOP 6</span>
        </h2>
        <p className="mt-2 text-center text-sm text-slate-300">
          Sistem Manajemen Jadwal Operasional & Tamu
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-white/20">

          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-800">Daftar Akun Pegawai</h3>
            <p className="text-sm text-slate-500 mt-1">Lengkapi form di bawah untuk mengajukan akun baru.</p>
          </div>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center animate-in zoom-in duration-300">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
              <h4 className="text-lg font-bold text-green-800">Pendaftaran Berhasil!</h4>
              <p className="text-sm text-green-600 mt-2">
                Akun Anda telah dicatat dengan status <strong>PENDING</strong>. Silakan tunggu Administrator menyetujui akun Anda sebelum dapat login.
              </p>
              <p className="text-xs text-green-500 mt-4">Mengarahkan ke halaman login...</p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">Nomor Induk Pegawai (NIPP)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    name="nipp"
                    type="text"
                    required
                    className="pl-10 block w-full text-sm border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0c1040] focus:border-[#0c1040] py-2.5 outline-none border transition"
                    placeholder="Masukkan NIPP Anda"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Nama Lengkap</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    name="name"
                    type="text"
                    required
                    className="pl-10 block w-full text-sm border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0c1040] focus:border-[#0c1040] py-2.5 outline-none border transition"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Email Pegawai</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    className="pl-10 block w-full text-sm border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0c1040] focus:border-[#0c1040] py-2.5 outline-none border transition"
                    placeholder="nama@kai.id"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Asal Unit / Divisi</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-slate-400" />
                  </div>
                  <select
                    name="unit_id"
                    required
                    className="pl-10 block w-full text-sm border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0c1040] focus:border-[#0c1040] py-2.5 outline-none border transition bg-white"
                  >
                    <option value="">-- Pilih Unit --</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.unit_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Jabatan / Tingkat</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-slate-400" />
                  </div>
                  <select
                    name="role"
                    required
                    className="pl-10 block w-full text-sm border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0c1040] focus:border-[#0c1040] py-2.5 outline-none border transition bg-white"
                  >
                    <option value="">-- Pilih Jabatan --</option>
                    <option value="MANAJER">Manajer</option>
                    <option value="ASISTEN_MANAJER">Asisten Manajer</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Kata Sandi</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    className="pl-10 block w-full text-sm border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0c1040] focus:border-[#0c1040] py-2.5 outline-none border transition"
                    placeholder="Minimal 6 karakter"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#ff7900] hover:bg-[#e06900] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff7900] disabled:opacity-70 transition-colors"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memproses...
                    </span>
                  ) : (
                    "Ajukan Akun Baru"
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Sudah memiliki akun?{" "}
              <Link to="/login" className="font-semibold text-[#0c1040] hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
