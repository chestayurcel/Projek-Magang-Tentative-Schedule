const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/schedules
 * Mengambil jadwal berdasarkan query parameter `view`:
 *   - view=GLOBAL  → Jadwal dengan status APPROVED & isGlobal = true
 *   - view=MY      → Jadwal milik user yang sedang login (semua status)
 *   - (default)    → Gabungan keduanya
 */
async function getSchedules(req, res) {
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const unitId = user?.unit_id || null;

    let whereClause = {
      OR: [
        { category: "BERSAMA", status: "APPROVED" },
        { user_id: userId },
        { target_user_id: userId, status: "APPROVED" },
      ]
    };

    if (unitId) {
      whereClause.OR.push({
        category: "UNIT",
        status: "APPROVED",
        user: { unit_id: unitId }
      });
    }

    const schedules = await prisma.schedule.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, nipp: true, unit_id: true, unit: { select: { unit_name: true } } } },
        guest: { select: { id: true, name: true, email: true } },
        target_user: { select: { id: true, name: true } },
      },
      orderBy: { start_time: 'asc' },
    });

    return res.status(200).json(schedules);
  } catch (error) {
    console.error('getSchedules error:', error);
    return res.status(500).json({ error: 'Gagal mengambil data jadwal.' });
  }
}

/**
 * POST /api/schedules
 * Membuat jadwal internal baru
 */
async function createSchedule(req, res) {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { start_date, start_time, end_date, end_time, notes, category, target_user_id } = req.body;

  if (!start_date || !start_time || !end_date || !end_time) {
    return res.status(400).json({ error: 'Tanggal dan waktu mulai serta selesai wajib diisi.' });
  }

  // Validasi jam kerja (08:00 - 16:00)
  if (start_time < '08:00' || start_time > '16:00' || end_time < '08:00' || end_time > '16:00') {
    return res.status(400).json({ error: 'Penambahan jadwal hanya dapat dilakukan pada jam kerja (08:00 - 16:00)' });
  }

  try {
    // Gabungkan tanggal dan jam menjadi format DateTime yang sesuai
    const combinedStartTime = new Date(`${start_date}T${start_time}:00`);
    const combinedEndTime = new Date(`${end_date}T${end_time}:00`);

    // Pengecekan Bentrok
    const existingConflict = await prisma.schedule.findFirst({
      where: {
        user_id: userId,
        start_time: { lt: combinedEndTime },
        end_time: { gt: combinedStartTime }
      }
    });

    if (existingConflict) {
      return res.status(400).json({ error: 'Gagal: Anda sudah memiliki jadwal lain di jam tersebut.' });
    }

    // Tentukan status berdasarkan role dan visibilitas
    let status = "PENDING";
    if (target_user_id && parseInt(target_user_id) !== userId) {
      // Jika menargetkan user lain, SELALU PENDING (menunggu persetujuan target)
      status = "PENDING";
    } else if (userRole === "SUPER_ADMIN" || userRole === "MANAJER" || userRole === "ASISTEN_MANAJER") {
      status = "APPROVED"; // Manajer ke atas langsung disetujui
    } else if (category === "PRIBADI" || category === "UNIT") {
      status = "APPROVED"; // Jadwal pribadi / unit langsung disetujui
    }

    const schedule = await prisma.schedule.create({
      data: {
        type: "INTERNAL",
        user_id: userId,
        start_time: combinedStartTime,
        end_time: combinedEndTime,
        notes: notes || null,
        category: category || "PRIBADI",
        status,
        target_user_id: target_user_id ? parseInt(target_user_id) : null,
      },
    });

    return res.status(201).json({ message: 'Jadwal berhasil dibuat.', schedule });
  } catch (error) {
    console.error('createSchedule error:', error);
    return res.status(500).json({ error: 'Gagal membuat jadwal.' });
  }
}

module.exports = { getSchedules, createSchedule, getPendingSchedules, approveSchedule, rejectSchedule, getIncomingSchedules, respondSchedule };

/**
 * GET /api/schedules/pending
 * Mengambil semua jadwal berstatus PENDING (untuk Admin)
 */
async function getPendingSchedules(req, res) {
  try {
    const schedules = await prisma.schedule.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { id: true, name: true, nipp: true, role: true } },
        guest: { select: { id: true, name: true, email: true } },
        target_user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(schedules);
  } catch (error) {
    console.error('getPendingSchedules error:', error);
    return res.status(500).json({ error: 'Gagal mengambil data jadwal pending.' });
  }
}

/**
 * PATCH /api/schedules/:id/approve
 */
async function approveSchedule(req, res) {
  const { id } = req.params;

  try {
    const schedule = await prisma.schedule.update({
      where: { id: parseInt(id) },
      data: { status: "APPROVED" },
      include: { user: { select: { name: true } } },
    });

    return res.status(200).json({ message: `Jadwal berhasil disetujui.`, schedule });
  } catch (error) {
    console.error('approveSchedule error:', error);
    return res.status(500).json({ error: 'Gagal menyetujui jadwal.' });
  }
}

/**
 * PATCH /api/schedules/:id/reject
 */
async function rejectSchedule(req, res) {
  const { id } = req.params;

  try {
    const schedule = await prisma.schedule.update({
      where: { id: parseInt(id) },
      data: { status: "REJECTED" },
      include: { user: { select: { name: true } } },
    });

    return res.status(200).json({ message: `Jadwal berhasil ditolak.`, schedule });
  } catch (error) {
    console.error('rejectSchedule error:', error);
    return res.status(500).json({ error: 'Gagal menolak jadwal.' });
  }
}

/**
 * GET /api/schedules/incoming
 * Mengambil jadwal yang ditargetkan ke user yang sedang login & berstatus PENDING
 */
async function getIncomingSchedules(req, res) {
  const userId = req.user.id;

  try {
    const schedules = await prisma.schedule.findMany({
      where: {
        target_user_id: userId,
        status: "PENDING",
      },
      include: {
        user: { select: { id: true, name: true, nipp: true, role: true } },
        target_user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(schedules);
  } catch (error) {
    console.error('getIncomingSchedules error:', error);
    return res.status(500).json({ error: 'Gagal mengambil undangan jadwal.' });
  }
}

/**
 * PATCH /api/schedules/:id/respond
 * User target menyetujui/menolak undangan jadwal
 * Body: { action: "approve" | "reject" }
 */
async function respondSchedule(req, res) {
  const { id } = req.params;
  const { action } = req.body;
  const userId = req.user.id;

  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Aksi harus berupa "approve" atau "reject".' });
  }

  try {
    // Cari jadwal dan pastikan user ini memang target-nya
    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(id) },
      include: { user: { select: { name: true } } },
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    }

    if (schedule.target_user_id !== userId) {
      return res.status(403).json({ error: 'Anda tidak berhak merespons jadwal ini.' });
    }

    if (schedule.status !== 'PENDING') {
      return res.status(400).json({ error: 'Jadwal ini sudah direspons sebelumnya.' });
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    const updated = await prisma.schedule.update({
      where: { id: parseInt(id) },
      data: { status: newStatus },
    });

    const msg = action === 'approve' ? 'disetujui' : 'ditolak';
    return res.status(200).json({ message: `Undangan jadwal dari ${schedule.user?.name} berhasil ${msg}.`, schedule: updated });
  } catch (error) {
    console.error('respondSchedule error:', error);
    return res.status(500).json({ error: 'Gagal merespons undangan jadwal.' });
  }
}
