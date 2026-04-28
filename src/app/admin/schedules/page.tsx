"use client";

import { useSession } from "next-auth/react";

export default function AdminSchedulesPage() {
  const { data: session } = useSession();

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-kai-blue mb-4">Permintaan Tamu Tertunda</h2>
        
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Nama Tamu</th>
                <th className="px-4 py-3 font-medium text-slate-700">Pegawai Tujuan</th>
                <th className="px-4 py-3 font-medium text-slate-700">Tanggal & Waktu</th>
                <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 font-medium text-right text-slate-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-800">John Doe</td>
                <td className="px-4 py-3 text-kai-blue font-medium">Budi (SDM)</td>
                <td className="px-4 py-3 text-slate-600">15 April 2026 - 10:00 AM</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                    TERTUNDA
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button className="text-kai-blue font-medium text-xs hover:underline border border-kai-blue px-3 py-1 rounded">Setujui</button>
                  <button className="text-red-500 font-medium text-xs hover:underline border border-red-500 px-3 py-1 rounded">Tolak</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="p-4 text-center text-slate-500 text-sm bg-white">
            *Tampilan antarmuka ini masih menggunakan data sementara. Data riil akan dihubungkan pada fase integrasi berikutnya.
          </div>
        </div>
      </div>
    </div>
  );
}
