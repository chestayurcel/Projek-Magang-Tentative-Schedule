import { PrismaClient, Role, AccountStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Hash password123 
  const hashedPassword = await bcrypt.hash("password123", 10);

  // 1. Tambahkan 2 Unit (Dummy)
  const unitIT = await prisma.unit.upsert({
    where: { unit_name: "Sistem Informasi" },
    update: {},
    create: { unit_name: "Sistem Informasi" }
  });

  const unitOps = await prisma.unit.upsert({
    where: { unit_name: "Operasional" },
    update: {},
    create: { unit_name: "Operasional" }
  });

  // 2. Tambahkan Super Admin
  await prisma.user.upsert({
    where: { email: "superadmin@kai.id" },
    update: {},
    create: {
      nipp: "SAD-001",
      name: "Super Admin KAI",
      email: "superadmin@kai.id",
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      unit_id: unitIT.id,
      account_status: AccountStatus.ACTIVE,
    },
  });

  // 3. Tambahkan Admin Utama
  await prisma.user.upsert({
    where: { email: "admin@kai.id" },
    update: {},
    create: {
      nipp: "ADM-001",
      name: "Admin KAI",
      email: "admin@kai.id",
      password: hashedPassword,
      role: Role.ADMIN,
      unit_id: unitIT.id,
      account_status: AccountStatus.ACTIVE,
    },
  });

  // 4. Tambahkan User A
  await prisma.user.upsert({
    where: { email: "usera@kai.id" },
    update: {},
    create: {
      nipp: "USR-001",
      name: "User A (IT)",
      email: "usera@kai.id",
      password: hashedPassword,
      role: Role.USER,
      unit_id: unitIT.id,
      account_status: AccountStatus.ACTIVE,
    },
  });

  // 5. Tambahkan User B
  await prisma.user.upsert({
    where: { email: "userb@kai.id" },
    update: {},
    create: {
      nipp: "USR-002",
      name: "User B (Ops)",
      email: "userb@kai.id",
      password: hashedPassword,
      role: Role.USER,
      unit_id: unitOps.id,
      account_status: AccountStatus.ACTIVE,
    },
  });

  console.log("Seeding berhasil! 2 Unit dan 4 Akun Uji Coba terdaftar.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
