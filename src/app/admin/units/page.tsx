import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminUnits } from "@/actions/admin";
import UnitsClient from "@/app/admin/units/UnitsClient";

export default async function AdminUnitsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Proteksi Akses Otorisasi Role Server-Side
  if (session.user.role === "USER") {
    redirect("/dashboard");
  }

  // Mengambil daftar unit beserta aggregate count jumlah pegawai
  const units = await getAdminUnits();

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-kai-blue tracking-tight">Manajemen Unit</h1>
        <p className="text-slate-500 mt-1">Kelola daftar divisi/unit untuk pemetaan asal pegawai DAOP 6.</p>
      </div>

      <UnitsClient initialUnits={units} />
    </div>
  );
}
