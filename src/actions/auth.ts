"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { RegisterUserSchema } from "@/lib/validations";
import { Role, AccountStatus } from "@prisma/client";

export async function getUnits() {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { unit_name: "asc" },
    });
    return units;
  } catch (error) {
    console.error("Gagal mengambil data unit:", error);
    return [];
  }
}

export async function registerUser(formData: FormData) {
  try {
    const data = Object.fromEntries(formData.entries());
    const parsed = RegisterUserSchema.safeParse(data);

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    // Pengecekan Duplikasi
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: parsed.data.email },
          { nipp: parsed.data.nipp }
        ]
      }
    });

    if (existingUser) {
      return { error: "Email atau NIPP tersebut sudah terdaftar pada sistem!" };
    }

    // Enkripsi Sandi
    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

    // Buat Akun
    const newUser = await prisma.user.create({
      data: {
        nipp: parsed.data.nipp,
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashedPassword,
        unit_id: parsed.data.unit_id,
        role: Role.USER, // Default mutlak: USER
        account_status: AccountStatus.PENDING // Default mutlak: PENDING
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Registrasi error:", error);
    return { error: "Terjadi kesalahan sistem saat pendaftaran" };
  }
}
