import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Clock, ShieldAlert } from "lucide-react";

export default async function AuditLogsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Hanya Super Admin yang berhak melihat log audit
  if (session.user.role !== "SUPER_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in zoom-in">
        <ShieldAlert size={80} className="text-red-500 mb-6 opacity-80" />
        <h1 className="text-3xl font-bold text-slate-800">Akses Ditolak</h1>
        <p className="text-slate-500 mt-2 max-w-md">Hanya tingkat otorisasi SUPER_ADMIN yang diizinkan untuk melihat rekam jejak aktivitas operasional (Audit Trail).</p>
      </div>
    );
  }

  // Ambil data log
  const logs = await prisma.auditLog.findMany({
    include: {
      user: {
        select: { name: true, role: true, nipp: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100 // Batasi 100 log terakhir
  });

  return (
    <div className="max-w-6xl mx-auto py-8 animate-in fade-in">
      <div className="mb-8 border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-bold text-kai-blue tracking-tight">Riwayat Aktivitas</h1>
        <p className="text-slate-500 mt-1">Rekam jejak (*Audit Trail*) semua tindakan administratif yang dilakukan di dalam sistem.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Waktu</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Pelaku (Admin)</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Kategori Aksi</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Detail Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Belum ada riwayat aktivitas administratif yang terekam.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap flex items-center">
                      <Clock size={14} className="mr-2 text-slate-400" />
                      {new Date(log.createdAt).toLocaleString("id-ID", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{log.user?.name || "User Terhapus"}</div>
                      <div className="text-xs text-slate-500">{log.user?.role}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-kai-blue border border-blue-100">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {log.details}
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
