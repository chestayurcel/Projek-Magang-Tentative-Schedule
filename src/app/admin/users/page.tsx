import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminUsers } from "@/actions/admin";
import UsersClient from "@/app/admin/users/UsersClient";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Proteksi Akses Otorisasi Role Server-Side
  if (session.user.role === "USER") {
    redirect("/dashboard");
  }

  // Ambil data menggunakan Server Action / Server Prisma langsung
  const users = await getAdminUsers();

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-kai-blue tracking-tight">Manajemen Pegawai</h1>
        <p className="text-slate-500 mt-1">Kelola perizinan pendaftaran akun dan daftar anggota aktif KAI DAOP 6.</p>
      </div>

      <UsersClient initialUsers={users} />
    </div>
  );
}
