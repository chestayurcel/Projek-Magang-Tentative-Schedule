"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

// Fungsi untuk membuat Audit Trail
export async function createAuditLog(action: string, details: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return; // Silent return if no session

  try {
    await prisma.auditLog.create({
      data: {
        action,
        details,
        userId: parseInt(session.user.id),
      }
    });
  } catch (err) {
    console.error("Gagal mencatat audit log:", err);
  }
}

// Update Informasi Profil
export async function updateProfile(name: string, email: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Akses ditolak." };

  if (!name.trim() || !email.trim()) {
    return { error: "Nama dan Email tidak boleh kosong." };
  }

  try {
    // Cek duplikasi email jika email diubah
    if (email !== session.user.email) {
      const existing = await prisma.user.findFirst({ where: { email } });
      if (existing) return { error: "Email sudah digunakan oleh akun lain." };
    }

    await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: { name: name.trim(), email: email.trim() }
    });

    await createAuditLog("UPDATE_PROFILE", "Memperbarui data identitas profil (Nama/Email)");

    return { success: true };
  } catch (error: any) {
    return { error: "Gagal memperbarui profil: " + error.message };
  }
}

// Ganti Kata Sandi
export async function changePassword(oldPass: string, newPass: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Akses ditolak." };

  if (!oldPass || newPass.length < 6) {
    return { error: "Kata sandi baru minimal 6 karakter." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) }
    });

    if (!user) return { error: "Pengguna tidak ditemukan." };

    // Validasi kata sandi lama
    const isPasswordValid = await bcrypt.compare(oldPass, user.password);
    if (!isPasswordValid) {
      return { error: "Kata sandi lama yang Anda masukkan salah!" };
    }

    // Enkripsi dan simpan kata sandi baru
    const hashedNewPassword = await bcrypt.hash(newPass, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword }
    });

    await createAuditLog("CHANGE_PASSWORD", "Melakukan penggantian kata sandi akun");

    return { success: true };
  } catch (error: any) {
    return { error: "Gagal mengganti kata sandi." };
  }
}
