import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export default async function ProfileSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Cek apakah pengguna minimal memiliki akses aplikasi (bisa dibebaskan ke semua user, tapi untuk saat ini khusus admin sesuai sidebar)
  if (session.user.role === "USER") {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8 border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-bold text-kai-blue tracking-tight">Keamanan & Profil</h1>
        <p className="text-slate-500 mt-1">Kelola identitas pribadi dan perbarui kata sandi akun Anda secara berkala.</p>
      </div>

      <ProfileClient initialName={session.user.name || ""} initialEmail={session.user.email || ""} />
    </div>
  );
}
