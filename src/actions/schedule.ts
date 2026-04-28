"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ScheduleType, ScheduleStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { CreateInternalScheduleSchema, CreateGuestScheduleSchema } from "@/lib/validations";

export async function getActiveUsers() {
  const users = await prisma.user.findMany({
    where: { account_status: "ACTIVE" },
    select: { id: true, name: true, role: true }
  });
  return users;
}

export async function createInternalSchedule(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Akses Ditolak. Anda belum login." };

    const data = Object.fromEntries(formData.entries());
    const parsed = CreateInternalScheduleSchema.safeParse({
      ...data,
      target_user_id: data.target_user_id ? parseInt(data.target_user_id as string) : undefined,
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    let scheduleStatus: ScheduleStatus = ScheduleStatus.PENDING;
    if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
      scheduleStatus = ScheduleStatus.APPROVED;
    } else if (parsed.data.visibility === "Pribadi") {
      scheduleStatus = ScheduleStatus.APPROVED;
    }

    const schedule = await prisma.schedule.create({
      data: {
        type: ScheduleType.INTERNAL,
        user_id: parseInt(session.user.id),
        target_user_id: parsed.data.target_user_id,
        start_time: parsed.data.start_time,
        end_time: parsed.data.end_time,
        notes: parsed.data.notes,
        isGlobal: parsed.data.visibility === "Keseluruhan",
        status: scheduleStatus,
      }
    });

    revalidatePath("/dashboard");
    return { success: true, schedule };
  } catch (err: any) {
    return { error: err.message || "Gagal membuat jadwal" };
  }
}

export async function createGuestSchedule(formData: FormData) {
  try {
    const data = Object.fromEntries(formData.entries());
    
    // Safely cast empty strings or invalid IDs to undefined to stop Foreign Key constraint violations
    const rawTarget = data.target_user_id as string;
    const tUid = rawTarget ? parseInt(rawTarget) : undefined;

    const parsed = CreateGuestScheduleSchema.safeParse({
      ...data,
      target_user_id: Number.isNaN(tUid) ? undefined : tUid,
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const guest = await prisma.guest.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        purpose: parsed.data.purpose,
      }
    });

    const schedule = await prisma.schedule.create({
      data: {
        type: ScheduleType.TAMU,
        guest_id: guest.id,
        target_user_id: parsed.data.target_user_id,
        start_time: parsed.data.start_time,
        end_time: parsed.data.end_time,
        notes: parsed.data.purpose, // Simpan keperluan tamu ke jadwal
        status: ScheduleStatus.PENDING,
      }
    });

    return { success: true, schedule };
  } catch (err: any) {
    return { error: err.message || "Gagal mengirimkan permohonan kunjungan" };
  }
}

export async function getSchedules(currentView: "GLOBAL" | "MY") {
  const session = await getServerSession(authOptions);
  
  if (currentView === "GLOBAL") {
    const schedules = await prisma.schedule.findMany({
      where: { 
        status: "APPROVED",
        isGlobal: true 
      },
      include: { user: true, guest: true, target_user: true }
    });
    return schedules;
  } else {
    if (!session?.user) return [];
    const myId = parseInt(session.user.id);
    const schedules = await prisma.schedule.findMany({
      where: {
        OR: [
          { user_id: myId },
          { target_user_id: myId }
        ]
      },
      include: { user: true, guest: true, target_user: true }
    });
    return schedules;
  }
}

export async function updateScheduleStatus(
  scheduleId: number, 
  status: ScheduleStatus,
  actionData?: { reason?: string; newStartTime?: Date; newEndTime?: Date }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return { error: "Akses Ditolak. Anda bukan Admin." };
    }

    const currentSchedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!currentSchedule) return { error: "Jadwal tidak ditemukan" };

    let updateData: any = { status };

    // Apend reasoning
    if (status === "REJECTED" && actionData?.reason) {
      updateData.notes = currentSchedule.notes 
        ? `${currentSchedule.notes}\n\nCatatan Admin (Ditolak): ${actionData.reason}` 
        : `Catatan Admin (Ditolak): ${actionData.reason}`;
    }

    // Apply rescheduling
    if (status === "RESCHEDULED" && actionData?.newStartTime && actionData?.newEndTime) {
      updateData.start_time = actionData.newStartTime;
      updateData.end_time = actionData.newEndTime;
    }

    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data: updateData
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin/schedules");
    return { success: true, updated };
  } catch (err: any) {
    return { error: err.message || "Gagal memperbarui status" };
  }
}
