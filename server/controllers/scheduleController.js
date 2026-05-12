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
        // Group meeting: user diundang sebagai participant & sudah APPROVE
        { participants: { some: { userId, status: "APPROVED" } } },
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
        participants: {
          include: {
            user: { select: { id: true, name: true, nipp: true, role: true } },
          },
        },
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
  const { start_date, start_time, end_date, end_time, notes, category, target_user_id, targetUserIds, actionType } = req.body;

  if (!start_date || !start_time || !end_date || !end_time) {
    return res.status(400).json({ error: 'Tanggal dan waktu mulai serta selesai wajib diisi.' });
  }

  // Catatan: Jam kerja kantor adalah 08:00 - 17:00. Jadwal di luar jam kerja
  // diperbolehkan, tapi frontend akan meminta konfirmasi user terlebih dahulu.

  try {
    // Gabungkan tanggal dan jam menjadi format DateTime yang sesuai
    const combinedStartTime = new Date(`${start_date}T${start_time}:00`);
    const combinedEndTime = new Date(`${end_date}T${end_time}:00`);

    // ====== CABANG GROUP MEETING (multi-undangan) ======
    if (actionType === 'MEETING') {
      // Normalisasi targetUserIds menjadi array number
      let rawIds = [];
      if (Array.isArray(targetUserIds)) rawIds = targetUserIds;
      else if (targetUserIds) rawIds = [targetUserIds];
      // Backward-compat: kalau frontend lama masih kirim target_user_id (single)
      else if (target_user_id) rawIds = [target_user_id];

      const inviteeIds = [...new Set(
        rawIds
          .map((v) => parseInt(v))
          .filter((v) => Number.isFinite(v) && v !== userId) // hapus duplikat & self
      )];

      if (inviteeIds.length === 0) {
        return res.status(400).json({ error: 'Pilih minimal 1 pegawai untuk diundang.' });
      }

      // Cek konflik untuk creator (jadwal sendiri)
      const creatorConflict = await prisma.schedule.findFirst({
        where: {
          user_id: userId,
          start_time: { lt: combinedEndTime },
          end_time: { gt: combinedStartTime },
        },
      });
      if (creatorConflict) {
        return res.status(400).json({ error: 'Gagal: Anda sudah punya jadwal lain pada jam tersebut.' });
      }

      // Status jadwal utama: APPROVED utk creator (langsung muncul di kalender pribadinya)
      const schedule = await prisma.schedule.create({
        data: {
          type: 'INTERNAL',
          user_id: userId,
          start_time: combinedStartTime,
          end_time: combinedEndTime,
          notes: notes || null,
          category: category || 'PRIBADI',
          status: 'APPROVED',
          target_user_id: null,
          created_by: null,
        },
      });

      // Bulk insert participants (status PENDING utk masing-masing invitee)
      await prisma.scheduleParticipant.createMany({
        data: inviteeIds.map((uid) => ({
          scheduleId: schedule.id,
          userId: uid,
          status: 'PENDING',
        })),
        skipDuplicates: true,
      });

      const withParticipants = await prisma.schedule.findUnique({
        where: { id: schedule.id },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, nipp: true, role: true } } },
          },
        },
      });

      return res.status(201).json({
        message: `Undangan jadwal berhasil dikirim ke ${inviteeIds.length} pegawai.`,
        schedule: withParticipants,
      });
    }

    // ====== CABANG DELEGATION & SELF (logika lama, JANGAN diubah) ======
    // Pengecekan Bentrok (untuk pemilik jadwal akhir)
    const finalUserId = (actionType === 'DELEGATION' && target_user_id) ? parseInt(target_user_id) : userId;

    const existingConflict = await prisma.schedule.findFirst({
      where: {
        user_id: finalUserId,
        start_time: { lt: combinedEndTime },
        end_time: { gt: combinedStartTime }
      }
    });

    if (existingConflict) {
      return res.status(400).json({ error: 'Gagal: Terdapat jadwal lain di jam tersebut untuk pengguna ini.' });
    }

    let finalTargetUserId = target_user_id ? parseInt(target_user_id) : null;
    let finalCreatedBy = null;
    let status = "PENDING";

    if (actionType === 'DELEGATION') {
      finalTargetUserId = null;
      finalCreatedBy = userId;
      status = "PENDING";
    } else if (target_user_id && parseInt(target_user_id) !== userId) {
      // Single-target meeting lama (kompatibilitas)
      status = "PENDING";
    } else if (userRole === "SUPER_ADMIN" || userRole === "MANAJER" || userRole === "ASISTEN_MANAJER") {
      status = "APPROVED"; // Manajer ke atas langsung disetujui
    } else if (category === "PRIBADI" || category === "UNIT") {
      status = "APPROVED"; // Jadwal pribadi / unit langsung disetujui
    }

    const schedule = await prisma.schedule.create({
      data: {
        type: "INTERNAL",
        user_id: finalUserId,
        start_time: combinedStartTime,
        end_time: combinedEndTime,
        notes: notes || null,
        category: category || "PRIBADI",
        status,
        target_user_id: finalTargetUserId,
        created_by: finalCreatedBy,
      },
    });

    return res.status(201).json({ message: 'Jadwal berhasil dibuat.', schedule });
  } catch (error) {
    console.error('createSchedule error:', error);
    return res.status(500).json({ error: 'Gagal membuat jadwal.' });
  }
}

module.exports = { getSchedules, createSchedule, getPendingSchedules, approveSchedule, rejectSchedule, getIncomingSchedules, respondSchedule, getRecapData };

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
 * Mengambil undangan jadwal PENDING untuk user yang sedang login.
 * Menggabungkan tiga sumber:
 *   - PARTICIPANT: user diundang ke group meeting via tabel ScheduleParticipant
 *   - MEETING (lama, single-target): target_user_id pada Schedule
 *   - DELEGATION: jadwal dititipkan ke kalender pribadi user oleh atasan
 *
 * Tiap item ditandai dengan field `kind` agar frontend tahu cara merespons.
 */
async function getIncomingSchedules(req, res) {
  const userId = req.user.id;

  try {
    // 1. Group-meeting invitations (tabel ScheduleParticipant)
    const participantRows = await prisma.scheduleParticipant.findMany({
      where: { userId, status: "PENDING" },
      include: {
        schedule: {
          include: {
            user: { select: { id: true, name: true, nipp: true, role: true } },
            participants: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const participantItems = participantRows
      .filter((p) => p.schedule) // safety
      .map((p) => ({
        ...p.schedule,
        kind: 'PARTICIPANT',
        participantId: p.id,
        participantStatus: p.status,
      }));

    // 2. Legacy single-target meeting + Delegation (Schedule.target_user_id / created_by)
    const scheduleRows = await prisma.schedule.findMany({
      where: {
        status: "PENDING",
        OR: [
          { target_user_id: userId }, // Meeting single-target (legacy)
          { user_id: userId, created_by: { not: null } }, // Delegasi
        ],
      },
      include: {
        user: { select: { id: true, name: true, nipp: true, role: true } },
        target_user: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const scheduleItems = scheduleRows.map((s) => ({
      ...s,
      kind: s.created_by != null && s.user_id === userId ? 'DELEGATION' : 'MEETING',
    }));

    // Gabung & urutkan terbaru di depan
    const combined = [...participantItems, ...scheduleItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.status(200).json(combined);
  } catch (error) {
    console.error('getIncomingSchedules error:', error);
    return res.status(500).json({ error: 'Gagal mengambil undangan jadwal.' });
  }
}

/**
 * PATCH /api/schedules/:id/respond
 * User menyetujui/menolak undangan jadwal.
 * Body: { action: "approve" | "reject", kind?: "PARTICIPANT" | "MEETING" | "DELEGATION" }
 *
 * - PARTICIPANT (group meeting): update row ScheduleParticipant milik user
 * - MEETING (single-target lama) atau DELEGATION: update Schedule.status (logika lama)
 *
 * Jika `kind` tidak dikirim, server auto-detect berdasarkan data yang ada.
 */
async function respondSchedule(req, res) {
  const scheduleId = parseInt(req.params.id);
  const { action, kind } = req.body;
  const userId = req.user.id;

  if (!action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Aksi harus berupa "approve" atau "reject".' });
  }

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
  const msg = action === 'approve' ? 'disetujui' : 'ditolak';

  try {
    // ==== Auto-detect kind kalau frontend tidak kirim ====
    let resolvedKind = (kind || '').toUpperCase();
    if (!['PARTICIPANT', 'MEETING', 'DELEGATION'].includes(resolvedKind)) {
      const participantRow = await prisma.scheduleParticipant.findFirst({
        where: { scheduleId, userId },
      });
      if (participantRow) {
        resolvedKind = 'PARTICIPANT';
      } else {
        resolvedKind = 'MEETING'; // akan dicek lagi di bawah (MEETING & DELEGATION pakai jalur sama)
      }
    }

    // ==== Cabang PARTICIPANT (group meeting baru) ====
    if (resolvedKind === 'PARTICIPANT') {
      const participant = await prisma.scheduleParticipant.findFirst({
        where: { scheduleId, userId },
        include: {
          schedule: { include: { user: { select: { name: true } } } },
        },
      });

      if (!participant) {
        return res.status(403).json({ error: 'Anda tidak diundang ke jadwal ini.' });
      }
      if (participant.status !== 'PENDING') {
        return res.status(400).json({ error: 'Anda sudah merespons undangan ini sebelumnya.' });
      }

      const updated = await prisma.scheduleParticipant.update({
        where: { id: participant.id },
        data: { status: newStatus },
      });

      const senderName = participant.schedule?.user?.name || 'Pengundang';
      return res.status(200).json({
        message: `Undangan jadwal dari ${senderName} berhasil ${msg}.`,
        participant: updated,
        kind: 'PARTICIPANT',
      });
    }

    // ==== Cabang MEETING (single-target lama) & DELEGATION ====
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        user: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    }

    const isTarget = schedule.target_user_id === userId;
    const isOwnerDelegated = schedule.user_id === userId && schedule.created_by !== null;

    if (!isTarget && !isOwnerDelegated) {
      return res.status(403).json({ error: 'Anda tidak berhak merespons jadwal ini.' });
    }

    if (schedule.status !== 'PENDING') {
      return res.status(400).json({ error: 'Jadwal ini sudah direspons sebelumnya.' });
    }

    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: newStatus },
    });

    const senderName = isOwnerDelegated ? schedule.creator?.name : schedule.user?.name;
    return res.status(200).json({
      message: `Jadwal dari ${senderName} berhasil ${msg}.`,
      schedule: updated,
      kind: isOwnerDelegated ? 'DELEGATION' : 'MEETING',
    });
  } catch (error) {
    console.error('respondSchedule error:', error);
    return res.status(500).json({ error: 'Gagal merespons undangan jadwal.' });
  }
}

/**
 * GET /api/schedules/recap?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&scope=mine|unit
 * Mengambil jadwal APPROVED dalam rentang tanggal, dikelompokkan per tanggal.
 * Akses dibatasi role manajemen (SUPER_ADMIN, MANAJER, ASISTEN_MANAJER).
 *
 * Query params:
 *  - startDate (required, format YYYY-MM-DD)
 *  - endDate   (required, format YYYY-MM-DD)
 *  - scope    (optional, default 'mine'):
 *      'mine' → jadwal milik user yang sedang login
 *      'unit' → jadwal seluruh anggota unit user
 */
async function getRecapData(req, res) {
  const userId = req.user.id;
  const { startDate, endDate, scope = 'mine' } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Parameter startDate dan endDate wajib diisi.' });
  }

  // Validasi format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return res.status(400).json({ error: 'Format tanggal harus YYYY-MM-DD.' });
  }

  try {
    // Range: dari awal hari startDate sampai akhir hari endDate
    const rangeStart = new Date(`${startDate}T00:00:00`);
    const rangeEnd = new Date(`${endDate}T23:59:59`);

    if (rangeStart > rangeEnd) {
      return res.status(400).json({ error: 'startDate tidak boleh setelah endDate.' });
    }

    // Ambil profil user yang login (untuk metadata laporan & filter scope)
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { unit: { select: { id: true, unit_name: true } } },
    });

    // Tentukan filter user_id berdasarkan scope
    let userFilter;
    if (scope === 'unit' && currentUser?.unit_id) {
      userFilter = { user: { unit_id: currentUser.unit_id } };
    } else {
      userFilter = { user_id: userId };
    }

    const schedules = await prisma.schedule.findMany({
      where: {
        status: 'APPROVED',
        start_time: { gte: rangeStart, lte: rangeEnd },
        ...userFilter,
      },
      include: {
        user: {
          select: {
            id: true, name: true, nipp: true, jabatan: true,
            unit: { select: { id: true, unit_name: true } },
          },
        },
        target_user: { select: { id: true, name: true, nipp: true, jabatan: true } },
        guest: { select: { id: true, name: true, email: true } },
      },
      orderBy: { start_time: 'asc' },
    });

    // Helper: Format label tanggal Indonesia, mis. "Senin, 15 Mei 2026"
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const formatDateLabel = (d) => {
      return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    };
    const pad = (n) => String(n).padStart(2, '0');
    const toDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const toTimeStr = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

    // Kelompokkan berdasarkan tanggal mulai
    const grouped = new Map();
    for (const s of schedules) {
      const startDt = new Date(s.start_time);
      const endDt = new Date(s.end_time);
      const key = toDateKey(startDt);

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: key,
          dateLabel: formatDateLabel(startDt),
          schedules: [],
        });
      }

      grouped.get(key).schedules.push({
        id: s.id,
        type: s.type,
        category: s.category,
        notes: s.notes,
        start_time: s.start_time,
        end_time: s.end_time,
        time_range: `${toTimeStr(startDt)} - ${toTimeStr(endDt)}`,
        user: s.user,
        target_user: s.target_user,
        guest: s.guest,
      });
    }

    // Convert Map ke array sorted by date
    const groups = Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));

    return res.status(200).json({
      period: { startDate, endDate },
      scope,
      total: schedules.length,
      reporter: currentUser ? {
        id: currentUser.id,
        name: currentUser.name,
        nipp: currentUser.nipp,
        jabatan: currentUser.jabatan,
        role: currentUser.role,
        unit: currentUser.unit,
      } : null,
      groups,
    });
  } catch (error) {
    console.error('getRecapData error:', error);
    return res.status(500).json({ error: 'Gagal mengambil data rekapitulasi jadwal.' });
  }
}
