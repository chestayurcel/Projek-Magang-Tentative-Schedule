import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const identifier = formData.get("identifier") as string;
    const password = formData.get("password") as string;

    const result = await login(identifier, password);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-kai-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-kai-blue p-8 text-center text-white">
          <img src="/logo_kai_putih.png" alt="Logo PT KAI" className="h-9 w-auto mx-auto" />
          <p className="text-sm opacity-80 mt-3">Masuk ke Sistem Jadwal Pegawai</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-600 outline-red-200 outline outline-1 rounded text-sm text-center font-medium">{error}</div>}
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">NIPP atau Alamat Email</label>
            <input required name="identifier" type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-kai-blue focus:ring-1 focus:ring-kai-blue transition-all" placeholder="Masukkan NIPP / Email Anda" />
          </div>

          <div className="space-y-1">
             <label className="text-sm font-medium text-slate-700">Kata Sandi</label>
             <input required name="password" type="password" className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-kai-blue focus:ring-1 focus:ring-kai-blue transition-all" placeholder="••••••••" />
          </div>

          <button disabled={isLoading} type="submit" className="w-full bg-kai-orange text-white py-3 rounded-md font-semibold hover:bg-[#d86600] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-6">
            {isLoading ? "Memproses..." : "Login"}
          </button>

          <div className="text-center pt-4 border-t border-slate-100 mt-6">
            <p className="text-sm text-slate-600">
              Belum punya akun?{" "}
              <Link to="/register" className="text-kai-blue font-semibold hover:underline">
                Daftar di sini
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
