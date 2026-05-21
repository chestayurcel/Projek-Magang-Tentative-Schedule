import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="bg-gradient-to-br from-white via-orange-100 to-orange-300">
      {/* ===== HERO (penuh satu layar) ===== */}
      <main className="relative min-h-screen flex items-center justify-center overflow-hidden">

        {/* Minimalist Grid Pattern Overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(#c2410c 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

        {/* Glowing atmospheric accents */}
        <div className="absolute top-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-[#ff7900] blur-[140px] opacity-20 z-0"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-orange-400 blur-[120px] opacity-20 z-0"></div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-5xl px-6 py-12 flex flex-col items-center text-center animate-in fade-in zoom-in duration-700">

          {/* App Logo */}
          <div className="mb-8">
            <img
              src="/logo_kai_warna.png"
              alt="Logo PT KAI"
              className="h-16 sm:h-20 w-auto mx-auto drop-shadow-md"
            />
          </div>

          {/* Hero Typography */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-800 tracking-tight leading-[1.15] mb-6">
            Sistem Manajemen <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F1551] to-[#ff7900]">Jadwal Kegiatan</span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-slate-500 font-medium tracking-wide mb-12 max-w-3xl mx-auto">
            PT Kereta Api Indonesia (Persero) <br className="block sm:hidden" /> DAOP 6 Yogyakarta
          </p>

          {/* Call to Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full max-w-md px-4 sm:px-0 mx-auto">

            <Link to="/login" className="w-full group">
              <button className="w-full px-8 py-5 flex items-center justify-center bg-[#ff7900] hover:bg-[#e06900] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-[0_0_24px_rgba(255,121,0,0.35)] hover:-translate-y-1 transition-all duration-300">
                Masuk ke Sistem / Login Pegawai
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-3 group-hover:translate-x-1 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </Link>

          </div>
        </div>
      </main>

      {/* ===== FOOTER (muncul setelah scroll) ===== */}
      <footer className="relative border-t border-white/40 bg-white/20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto py-10 px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 text-sm text-slate-700 leading-relaxed">

            {/* ===== Kolom Kiri ===== */}
            <div className="space-y-4">
              <p className="max-w-md">
                Sistem digital terpadu untuk mengoptimalkan koordinasi jadwal operasional, persetujuan agenda, dan pendelegasian tugas di lingkungan PT Kereta Api Indonesia (Persero) DAOP 6 Yogyakarta.
              </p>
              <p>
                &copy; 2026 PT Kereta Api Indonesia (Persero) DAOP 6 Yogyakarta.
              </p>
            </div>

            {/* ===== Kolom Kanan ===== */}
            <div className="space-y-2">
              <p>
                Dikembangkan oleh Chesta Yurcel Zebada, S1 Teknologi Informasi Universitas Muhammadiyah Yogyakarta.
              </p>
              <p>
                <a href="tel:087886698385" className="hover:text-slate-900 transition-colors">087886698385</a>
                {" · "}
                <a href="mailto:chestayurcel@gmail.com" className="hover:text-slate-900 transition-colors">chestayurcel@gmail.com</a>
              </p>
            </div>

          </div>
        </div>
      </footer>

    </div>
  );
}
