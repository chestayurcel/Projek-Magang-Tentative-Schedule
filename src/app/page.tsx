import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0F1551]">
      {/* Background Gradient & Patterns */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00529b] via-[#0F1551] to-[#0a0d36] opacity-90 z-0"></div>
      
      {/* Minimalist Grid Pattern Overlay */}
      <div className="absolute inset-0 z-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      
      {/* Glowing atmospheric accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#ff7900] blur-[150px] opacity-20 z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#00529b] blur-[150px] opacity-40 z-0"></div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-5xl px-6 py-12 flex flex-col items-center text-center animate-in fade-in zoom-in duration-700">
        
        {/* App Logo / Badge */}
        <div className="mb-8 inline-flex items-center justify-center p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl overflow-hidden">
          <div className="bg-white rounded-full px-5 py-3 flex items-center justify-center">
            <Image src="/logo_kai_warna.png" alt="Logo KAI" width={80} height={30} className="object-contain" priority />
          </div>
        </div>

        {/* Hero Typography */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.15] mb-6 drop-shadow-lg">
          Sistem Manajemen Penjadwalan <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300"> & Buku Tamu</span>
        </h1>
        
        <p className="text-lg sm:text-xl md:text-2xl text-slate-200 font-medium tracking-wide mb-12 max-w-3xl mx-auto drop-shadow-md">
          PT Kereta Api Indonesia (Persero) <br className="block sm:hidden" /> DAOP 6 Yogyakarta
        </p>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full max-w-2xl px-4 sm:px-0">
          
          <Link href="/guest" className="w-full sm:w-1/2 group">
            <button className="w-full px-6 py-4 flex items-center justify-center bg-[#ff7900] hover:bg-[#e06900] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(255,121,0,0.4)] hover:-translate-y-1 transition-all duration-300">
              Form Pengajuan Tamu
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-x-1 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </Link>

          <Link href="/login" className="w-full sm:w-1/2 group">
            <button className="w-full px-6 py-4 flex items-center justify-center bg-white/5 border-2 border-white/30 hover:border-white text-white font-semibold text-lg rounded-xl hover:bg-white/10 backdrop-blur-sm transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Login Pegawai Internal
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-3 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </button>
          </Link>

        </div>
        
        {/* Footer Disclaimer */}
        <div className="mt-20 text-xs sm:text-sm text-slate-400 opacity-60">
           &copy; {new Date().getFullYear()} PT Kereta Api Indonesia (Persero) DAOP 6 Yogyakarta. All rights reserved.
        </div>

      </div>
    </div>
  );
}
