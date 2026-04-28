"use client";

import { useState } from "react";
import { approveUser, rejectUser } from "@/actions/admin";
import { Check, X } from "lucide-react";

interface UsersClientProps {
  initialUsers: any[];
}

export default function UsersClient({ initialUsers }: UsersClientProps) {
  const [activeTab, setActiveTab] = useState<"PENDING" | "ACTIVE">("PENDING");
  const [isProcessing, setIsProcessing] = useState<number | null>(null);

  // Pemisahan list berdasarkan tab aktif
  const filteredUsers = initialUsers.filter((u) => u.account_status === activeTab);

  const handleApprove = async (id: number) => {
    if (!confirm("Setujui akun pegawai ini?")) return;
    setIsProcessing(id);
    const res = await approveUser(id);
    if (res.error) alert(res.error);
    setIsProcessing(null);
  };

  const handleReject = async (id: number) => {
    if (!confirm("Tolak dan hapus permanen pendaftaran ini?")) return;
    setIsProcessing(id);
    const res = await rejectUser(id);
    if (res.error) alert(res.error);
    setIsProcessing(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1.5 rounded-lg w-max shadow-inner">
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`px-5 py-2 rounded-md font-medium text-sm transition-all duration-200 flex items-center ${
            activeTab === "PENDING" 
              ? "bg-white text-kai-blue shadow-sm" 
              : "text-slate-500 hover:text-kai-blue"
          }`}
        >
          Menunggu Persetujuan
          {initialUsers.filter(u => u.account_status === "PENDING").length > 0 && (
            <span className="ml-2 bg-kai-orange text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {initialUsers.filter(u => u.account_status === "PENDING").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("ACTIVE")}
          className={`px-5 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
            activeTab === "ACTIVE" 
              ? "bg-white text-kai-blue shadow-sm" 
              : "text-slate-500 hover:text-kai-blue"
          }`}
        >
          Daftar Pegawai Aktif
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">NIPP</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nama Lengkap</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Email</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Unit</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada data pegawai di tab ini.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-medium text-slate-800">{user.nipp}</td>
                    <td className="px-6 py-4 text-slate-700">{user.name}</td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-slate-600">{user.unit?.unit_name || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      {activeTab === "PENDING" ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            disabled={isProcessing === user.id}
                            onClick={() => handleApprove(user.id)}
                            className="flex items-center px-3 py-1.5 bg-[#00529b] text-white text-xs font-semibold rounded hover:bg-blue-800 transition disabled:opacity-50"
                          >
                            <Check size={14} className="mr-1" /> Setujui
                          </button>
                          <button 
                            disabled={isProcessing === user.id}
                            onClick={() => handleReject(user.id)}
                            className="flex items-center px-3 py-1.5 border border-red-500 text-red-600 text-xs font-semibold rounded hover:bg-red-50 transition disabled:opacity-50"
                          >
                            <X size={14} className="mr-1" /> Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Aktif
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
