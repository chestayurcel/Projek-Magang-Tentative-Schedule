import { PrismaClient, Role, AccountStatus, ScheduleType, ScheduleStatus, ScheduleCategory, RealizationStatus } from "@prisma/client";
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
  const superadmin = await prisma.user.upsert({
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

  // 3. Tambahkan Manajer Utama
  const manajer = await prisma.user.upsert({
    where: { email: "manajer@kai.id" },
    update: {},
    create: {
      nipp: "MNJ-001",
      name: "Manajer KAI",
      email: "manajer@kai.id",
      password: hashedPassword,
      role: Role.MANAJER,
      unit_id: unitIT.id,
      account_status: AccountStatus.ACTIVE,
    },
  });

  // 4. Tambahkan Staff A
  const staffA = await prisma.user.upsert({
    where: { email: "staffa@kai.id" },
    update: {},
    create: {
      nipp: "STF-001",
      name: "Staff A (IT)",
      email: "staffa@kai.id",
      password: hashedPassword,
      role: Role.STAFF,
      unit_id: unitIT.id,
      account_status: AccountStatus.ACTIVE,
    },
  });

  // 5. Tambahkan Staff B
  const staffB = await prisma.user.upsert({
    where: { email: "staffb@kai.id" },
    update: {},
    create: {
      nipp: "STF-002",
      name: "Staff B (Ops)",
      email: "staffb@kai.id",
      password: hashedPassword,
      role: Role.STAFF,
      unit_id: unitOps.id,
      account_status: AccountStatus.ACTIVE,
    },
  });

  // 6. Tambahkan Data Dummy Jadwal Tidak Sesuai (Merah)
  // Jadwal di masa lalu (contoh: 2 hari yang lalu)
  const pastDate1 = new Date();
  pastDate1.setDate(pastDate1.getDate() - 2);
  pastDate1.setHours(9, 0, 0, 0);
  
  const pastDate1End = new Date(pastDate1);
  pastDate1End.setHours(11, 0, 0, 0);

  const pastDate2 = new Date();
  pastDate2.setDate(pastDate2.getDate() - 3);
  pastDate2.setHours(13, 0, 0, 0);

  const pastDate2End = new Date(pastDate2);
  pastDate2End.setHours(15, 0, 0, 0);

  const pastDate3 = new Date();
  pastDate3.setDate(pastDate3.getDate() - 4);
  pastDate3.setHours(10, 0, 0, 0);

  const pastDate3End = new Date(pastDate3);
  pastDate3End.setHours(12, 0, 0, 0);

  // Jadwal Pribadi Tidak Sesuai
  await prisma.schedule.create({
    data: {
      type: ScheduleType.INTERNAL,
      user_id: staffA.id,
      created_by: staffA.id,
      start_time: pastDate1,
      end_time: pastDate1End,
      status: ScheduleStatus.APPROVED,
      category: ScheduleCategory.PRIBADI,
      notes: "Rapat koordinasi pengembangan aplikasi",
      realizationStatus: RealizationStatus.TIDAK_SESUAI,
      realizationNotes: "Rapat dibatalkan karena ada penugasan mendadak ke luar kota.",
      hasBeenRescheduled: false
    }
  });

  // Jadwal Unit Tidak Sesuai
  await prisma.schedule.create({
    data: {
      type: ScheduleType.INTERNAL,
      user_id: manajer.id,
      created_by: manajer.id,
      start_time: pastDate2,
      end_time: pastDate2End,
      status: ScheduleStatus.APPROVED,
      category: ScheduleCategory.UNIT,
      notes: "Evaluasi kinerja bulanan Unit IT",
      realizationStatus: RealizationStatus.TIDAK_SESUAI,
      realizationNotes: "Ditunda karena tidak memenuhi kuorum (beberapa anggota cuti).",
      hasBeenRescheduled: false
    }
  });

  // Jadwal Bersama Tidak Sesuai
  await prisma.schedule.create({
    data: {
      type: ScheduleType.INTERNAL,
      user_id: superadmin.id,
      created_by: superadmin.id,
      start_time: pastDate3,
      end_time: pastDate3End,
      status: ScheduleStatus.APPROVED,
      category: ScheduleCategory.BERSAMA,
      notes: "Sosialisasi keamanan siber dengan seluruh Manajer",
      realizationStatus: RealizationStatus.TIDAK_SESUAI,
      realizationNotes: "Narasumber berhalangan hadir pada jam yang ditentukan.",
      hasBeenRescheduled: false
    }
  });

  console.log("Seeding berhasil! 2 Unit, 4 Akun Uji Coba, dan 3 Jadwal Tidak Sesuai telah terdaftar.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
