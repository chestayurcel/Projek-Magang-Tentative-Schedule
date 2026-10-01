import { PrismaClient, Role, AccountStatus, ScheduleType, ScheduleStatus, ScheduleCategory, RealizationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);
  
  // 1. Pastikan akun admin@kai.id (yang diminta) tersedia
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@kai.id" },
    update: {},
    create: {
      nipp: "ADM-999",
      name: "Admin Utama KAI",
      email: "admin@kai.id",
      password: hashedPassword,
      role: Role.MANAJER,
      account_status: AccountStatus.ACTIVE,
    }
  });

  const schedules = [];
  
  // Hari kerja di bulan September 2026 (tanggal 1 hingga 30)
  const days = [1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30];

  const titlesPribadi = ["Review Dokumen Kontrak", "Pengecekan Server Utama", "Meeting 1-on-1 Staff", "Analisis Laporan Keuangan", "Follow up Vendor Eksternal", "Penyusunan Jadwal Shift", "Kunjungan Lapangan", "Penyelesaian Dokumen SLA"];
  const titlesUnit = ["Rapat Evaluasi Mingguan", "Briefing Pagi Unit IT", "Update Progres Aplikasi Jadwal", "Diskusi Kinerja Tim", "Rapat Koordinasi Operasional", "Sync Up Mingguan"];
  const titlesBersama = ["Townhall Meeting KAI DAOP 6", "Pelatihan K3 Terpusat", "Sosialisasi Peraturan Baru Dirut", "Rapat Lintas Divisi SDM & IT", "Webinar Internal KAI", "Apel Pagi Gabungan"];

  // Kita buat 45 jadwal agar kalender terlihat sangat padat dan warna-warni
  for (let i = 0; i < 45; i++) {
      const day = days[Math.floor(Math.random() * days.length)];
      const startHour = Math.floor(Math.random() * 8) + 8; 
      const endHour = startHour + Math.floor(Math.random() * 2) + 1; 

      const start = new Date(2026, 8, day, startHour, 0, 0); 
      const end = new Date(2026, 8, day, endHour, 0, 0);

      const categoryRand = Math.random();
      let cat, notes, realStatus;

      const now = new Date();
      if (start < now) {
          const realRand = Math.random();
          if (realRand > 0.6) {
              realStatus = RealizationStatus.TIDAK_SESUAI;
          } else if (realRand > 0.2) {
              realStatus = RealizationStatus.SESUAI;
          } else {
              realStatus = RealizationStatus.BELUM_DIISI;
          }
      } else {
          realStatus = RealizationStatus.BELUM_DIISI;
      }

      if (categoryRand < 0.35) {
          cat = ScheduleCategory.PRIBADI;
          notes = titlesPribadi[Math.floor(Math.random() * titlesPribadi.length)] + ` (Sesi ${i+1})`;
      } else if (categoryRand < 0.7) {
          cat = ScheduleCategory.UNIT;
          notes = titlesUnit[Math.floor(Math.random() * titlesUnit.length)] + ` (M-${day})`;
      } else {
          cat = ScheduleCategory.BERSAMA;
          notes = titlesBersama[Math.floor(Math.random() * titlesBersama.length)];
      }

      schedules.push({
          type: ScheduleType.INTERNAL,
          user_id: adminUser.id,
          created_by: adminUser.id,
          start_time: start,
          end_time: end,
          status: Math.random() > 0.9 ? ScheduleStatus.PENDING : ScheduleStatus.APPROVED,
          category: cat,
          notes: notes,
          realizationStatus: realStatus,
          realizationNotes: realStatus === RealizationStatus.TIDAK_SESUAI ? "Ada kendala teknis / perubahan jadwal mendadak" : null,
          hasBeenRescheduled: false,
      });
  }

  await prisma.schedule.createMany({
      data: schedules
  });

  console.log("Berhasil! 45 jadwal dummy untuk bulan September 2026 telah ditambahkan ke admin@kai.id.");
}

main().catch(console.error).finally(() => prisma.$disconnect());

