"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/profile";

// --- MIDDLEWARE SERVER SIDE ---
async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Akses ditolak: Hanya Admin yang dapat mengakses rute ini.");
  }
}

// --- MANAJEMEN PEGAWAI (USERS) ---
export async function getAdminUsers() {
  await checkAdminAuth();
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: "SUPER_ADMIN" } }, // Lindungi Super Admin
      include: { unit: true },
      orderBy: { createdAt: "desc" }
    });
    return JSON.parse(JSON.stringify(users));
  } catch (error) {
    console.error("Gagal mengambil data pegawai:", error);
    return [];
  }
}

export async function approveUser(userId: number) {
  await checkAdminAuth();
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { account_status: "ACTIVE" }
    });
    
    // Temukan nama user untuk log
    const approvedUser = await prisma.user.findUnique({ where: { id: userId } });
    if (approvedUser) {
      await createAuditLog("APPROVE_USER", `Menyetujui pendaftaran pegawai: ${approvedUser.name} (${approvedUser.nipp})`);
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Gagal menyetujui akun" };
  }
}

export async function rejectUser(userId: number) {
  await checkAdminAuth();
  try {
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    
    // Menghapus data akun sepenuhnya dari database agar bersih
    await prisma.user.delete({
      where: { id: userId }
    });

    if (targetUser) {
      await createAuditLog("REJECT_USER", `Menolak dan menghapus pendaftaran: ${targetUser.name} (${targetUser.nipp})`);
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Gagal menolak akun" };
  }
}


// --- MANAJEMEN UNIT (UNITS) ---
export async function getAdminUnits() {
  await checkAdminAuth();
  try {
    const units = await prisma.unit.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { unit_name: "asc" }
    });
    return JSON.parse(JSON.stringify(units));
  } catch (error) {
    console.error("Gagal mengambil data unit:", error);
    return [];
  }
}

export async function createUnit(name: string) {
  await checkAdminAuth();
  if (!name || name.trim() === "") return { error: "Nama unit tidak boleh kosong" };
  try {
    await prisma.unit.create({
      data: { unit_name: name.trim() }
    });
    await createAuditLog("CREATE_UNIT", `Menambahkan unit baru: ${name.trim()}`);
    revalidatePath("/admin/units");
    return { success: true };
  } catch (error: any) {
    // Prisma P2002: Constraint unique violation
    if (error.code === 'P2002') return { error: "Unit dengan nama ini sudah ada." };
    return { error: error.message || "Gagal menambahkan unit" };
  }
}

export async function updateUnit(id: number, newName: string) {
  await checkAdminAuth();
  if (!newName || newName.trim() === "") return { error: "Nama unit tidak boleh kosong" };
  try {
    const oldUnit = await prisma.unit.findUnique({ where: { id } });
    await prisma.unit.update({
      where: { id },
      data: { unit_name: newName.trim() }
    });
    await createAuditLog("UPDATE_UNIT", `Mengubah nama unit: "${oldUnit?.unit_name}" menjadi "${newName.trim()}"`);
    revalidatePath("/admin/units");
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "Unit dengan nama tersebut sudah ada." };
    return { error: error.message || "Gagal mengedit unit" };
  }
}

export async function deleteUnit(id: number) {
  await checkAdminAuth();
  try {
    // Pengecekan Constraint Manual (Bisa juga ditangani otomatis oleh Prisma Error Code)
    const count = await prisma.user.count({ where: { unit_id: id } });
    if (count > 0) {
      return { error: `Gagal! Terdapat ${count} pegawai aktif/pending yang masih menempati Unit ini.` };
    }

    const oldUnit = await prisma.unit.findUnique({ where: { id } });
    await prisma.unit.delete({
      where: { id }
    });
    await createAuditLog("DELETE_UNIT", `Menghapus unit: ${oldUnit?.unit_name}`);
    revalidatePath("/admin/units");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Gagal menghapus unit" };
  }
}
