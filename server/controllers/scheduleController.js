const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

/**
 * Generate list of occurrence dates (YYYY-MM-DD strings) untuk recurring schedule.
 * Capped 100 occurrences sebagai safety guard.
 */
function generateOccurrenceDates(startDateStr, endDateStr, frequency) {
  const dates = [];
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];

  const pad = (n) => String(n).padStart(2, '0');
  const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const cursor = new Date(start);
  let safety = 100; // limit max occurrences
  while (cursor <= end && safety-- > 0) {
    dates.push(toDateStr(cursor));
    if (frequency === 'DAILY') cursor.setDate(cursor.getDate() + 1);
    else if (frequency === 'WEEKLY') cursor.setDate(cursor.getDate() + 7);
    else if (frequency === 'MONTHLY') cursor.setMonth(cursor.getMonth() + 1);
    else break;
  }
  return dates;
}

/**
 * Utility: cari jadwal APPROVED yang overlap dengan rentang waktu, di mana
 * user yang diberikan adalah "owner efektif" — yaitu schedule.user_id = userId
 * (pemilik langsung), target_user_id = userId (target meeting single), atau
 * ada di tabel participants dengan status APPROVED (group meeting).
 *
 * Pakai untuk pre-check sebelum:
 *  - Membuat jadwal SELF (langsung tolak kalau bentrok)
 *  - Menyetujui undangan/delegasi (tolak persetujuan kalau bentrok)
 *
 * @param {number} userId
 * @param {Date} startTime
 * @param {Date} endTime
 * @param {number|null} excludeScheduleId  Schedule id yang dikecualikan (jadwal diri sendiri saat respond)
 * @returns {Promise<object|null>} Schedule yang bentrok, atau null kalau bersih.
 */
async function findApprovedConflict(userId, startTime, endTime, excludeScheduleId = null) {
  const where = {
    start_time: { lt: endTime },
    end_time: { gt: startTime },
    OR: [
      { user_id: userId, status: 'APPROVED' },
      { target_user_id: userId, status: 'APPROVED' },
      { participants: { some: { userId, status: 'APPROVED' } } },
    ],
  };
  if (excludeScheduleId != null) {
    where.id = { not: excludeScheduleId };
  }
  return prisma.schedule.findFirst({ where });
}

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
 * Internal helper: bikin SATU jadwal dengan params yang sudah ter-resolve.
 * Tidak berurusan dengan HTTP — return { ok, schedule } atau { ok: false, error }.
 *
 * Dipakai oleh `createSchedule` untuk:
 *  - Single (non-recurring): dipanggil 1x
 *  - Recurring: dipanggil N kali di dalam loop, tiap iteration dengan
 *    `startTime`/`endTime` yang berbeda tapi metadata lain (notes, kategori, target) sama.
 *
 * Tiap jadwal yang dibuat punya `recurrenceGroupId` yang sama (kalau diberikan),
 * tapi tetap mandiri secara approval/realization/reschedule.
 */
async function _createOneSchedule({
  userId, userRole, startTime, endTime,
  notes, category, actionType,
  targetUserIds, target_user_id,
  recurrenceGroupId = null,
  recurrenceFrequency = null,
}) {
  try {
    // ===== Group MEETING branch =====
    if (actionType === 'MEETING') {
      let rawIds = [];
      if (Array.isArray(targetUserIds)) rawIds = targetUserIds;
      else if (targetUserIds) rawIds = [targetUserIds];
      else if (target_user_id) rawIds = [target_user_id]; // back-compat

      const inviteeIds = [...new Set(
        rawIds.map((v) => parseInt(v)).filter((v) => Number.isFinite(v) && v !== userId)
      )];

      if (inviteeIds.length === 0) {
        return { ok: false, error: 'Pilih minimal 1 pegawai untuk diundang.' };
      }

      const schedule = await prisma.schedule.create({
        data: {
          type: 'INTERNAL',
          user_id: userId,
          start_time: startTime,
          end_time: endTime,
          notes: notes || null,
          category: category || 'PRIBADI',
          status: 'PENDING',
          target_user_id: null,
          created_by: null,
          recurrenceGroupId,
          recurrenceFrequency,
        },
      });

      await prisma.scheduleParticipant.createMany({
        data: inviteeIds.map((uid) => ({
          scheduleId: schedule.id,
          userId: uid,
          status: 'PENDING',
        })),
        skipDuplicates: true,
      });

      return { ok: true, schedule, inviteeCount: inviteeIds.length };
    }

    // ===== SELF / DELEGATION branch =====
    const finalUserId = (actionType === 'DELEGATION' && target_user_id) ? parseInt(target_user_id) : userId;

    // Hard-block overlap untuk SELF (DELEGATION dicek nanti saat target Approve)
    if (actionType !== 'DELEGATION') {
      const conflict = await findApprovedConflict(finalUserId, startTime, endTime);
      if (conflict) {
        return { ok: false, error: 'Waktu ini sudah terisi oleh jadwal lain.' };
      }
    }

    let finalTargetUserId = target_user_id ? parseInt(target_user_id) : null;
    let finalCreatedBy = null;
    let status = 'PENDING';

    if (actionType === 'DELEGATION') {
      finalTargetUserId = null;
      finalCreatedBy = userId;
      status = 'PENDING';
    } else if (target_user_id && parseInt(target_user_id) !== userId) {
      status = 'PENDING';
    } else if (['SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER'].includes(userRole)) {
      status = 'APPROVED';
    } else if (category === 'PRIBADI' || category === 'UNIT') {
      status = 'APPROVED';
    }

    const schedule = await prisma.schedule.create({
      data: {
        type: 'INTERNAL',
        user_id: finalUserId,
        start_time: startTime,
        end_time: endTime,
        notes: notes || null,
        category: category || 'PRIBADI',
        status,
        target_user_id: finalTargetUserId,
        created_by: finalCreatedBy,
        recurrenceGroupId,
        recurrenceFrequency,
      },
    });

    return { ok: true, schedule };
  } catch (err) {
    return { ok: false, error: err.message || 'Gagal membuat jadwal.' };
  }
}

/**
 * POST /api/schedules
 * Membuat jadwal internal baru. Mendukung:
 *  - Single schedule (default)
 *  - Recurring schedule: body { isRecurring: true, frequency: 'DAILY'|'WEEKLY'|'MONTHLY', recurrenceEndDate: 'YYYY-MM-DD' }
 *
 * Tiap jadwal hasil duplikasi recurring berbagi `recurrenceGroupId` yang sama,
 * tapi tetap mandiri untuk Approval/Reschedule/Realisasi.
 */
async function createSchedule(req, res) {
  const userId = req.user.id;
  const userRole = req.user.role;
  const {
    start_date, start_time, end_date, end_time,
    notes, category, target_user_id, targetUserIds, actionType,
    isRecurring, frequency, recurrenceEndDate,
    rescheduleFromId,
  } = req.body;

  if (!start_date || !start_time || !end_date || !end_time) {
    return res.status(400).json({ error: 'Tanggal dan waktu mulai serta selesai wajib diisi.' });
  }

  // Normalisasi rescheduleFromId → integer atau null
  const rescheduleFromIdInt = rescheduleFromId ? parseInt(rescheduleFromId) : null;

  // Helper: mark jadwal lama sebagai sudah-dijadwalkan-ulang setelah sukses buat baru.
  // Gagal di sini tidak boleh membatalkan response sukses (soft-tagging).
  async function markRescheduledIfRequested() {
    if (!rescheduleFromIdInt) return;
    try {
      await prisma.schedule.update({
        where: { id: rescheduleFromIdInt },
        data: { hasBeenRescheduled: true },
      });
    } catch (e) {
      console.warn('Gagal menandai jadwal lama sebagai sudah-direschedule:', e.message);
    }
  }

  try {
    const firstStart = new Date(`${start_date}T${start_time}:00`);
    const firstEnd = new Date(`${end_date}T${end_time}:00`);
    const durationMs = firstEnd.getTime() - firstStart.getTime();
    if (durationMs <= 0) {
      return res.status(400).json({ error: 'Waktu selesai harus setelah waktu mulai.' });
    }

    // ====== BRANCH: RECURRING ======
    if (isRecurring && frequency && recurrenceEndDate) {
      const validFreq = ['DAILY', 'WEEKLY', 'MONTHLY'];
      if (!validFreq.includes(frequency)) {
        return res.status(400).json({ error: 'Frekuensi tidak valid. Pilih: DAILY, WEEKLY, MONTHLY.' });
      }

      const dates = generateOccurrenceDates(start_date, recurrenceEndDate, frequency);
      if (dates.length === 0) {
        return res.status(400).json({
          error: 'Tidak ada tanggal yang dihasilkan. Pastikan Tanggal Berakhir tidak lebih awal dari Tanggal Mulai.',
        });
      }

      const recurrenceGroupId = crypto.randomUUID();
      const created = [];
      const skipped = [];

      // Ambil potongan jam dari first start (jam pertama dipakai utk semua occurrences)
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${pad(firstStart.getHours())}:${pad(firstStart.getMinutes())}`;

      for (const occDateStr of dates) {
        const occStart = new Date(`${occDateStr}T${timeStr}:00`);
        const occEnd = new Date(occStart.getTime() + durationMs);

        const result = await _createOneSchedule({
          userId, userRole,
          startTime: occStart, endTime: occEnd,
          notes, category, actionType,
          targetUserIds, target_user_id,
          recurrenceGroupId,
          recurrenceFrequency: frequency,
        });

        if (result.ok) {
          created.push({ id: result.schedule.id, date: occDateStr });
        } else {
          skipped.push({ date: occDateStr, reason: result.error });
        }
      }

      if (created.length === 0) {
        return res.status(400).json({
          error: 'Tidak ada jadwal yang berhasil dibuat. Semua terlewat (lihat detail).',
          totalPlanned: dates.length,
          created: 0,
          skipped,
        });
      }

      // Setidaknya 1 jadwal baru berhasil dibuat → mark jadwal lama sebagai sudah direschedule
      await markRescheduledIfRequested();

      return res.status(201).json({
        message: `Berhasil membuat ${created.length} jadwal rutin dari ${dates.length} kemungkinan${skipped.length > 0 ? ` (${skipped.length} dilewati karena bentrok/error)` : ''}.`,
        recurrenceGroupId,
        totalPlanned: dates.length,
        created,
        skipped,
      });
    }

    // ====== BRANCH: SINGLE ======
    const result = await _createOneSchedule({
      userId, userRole,
      startTime: firstStart, endTime: firstEnd,
      notes, category, actionType,
      targetUserIds, target_user_id,
    });

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    // Sukses single → mark jadwal lama (kalau ada referensi)
    await markRescheduledIfRequested();

    // Untuk MEETING: kembalikan schedule dengan participants ter-include (kompatibel dengan respons lama)
    if (actionType === 'MEETING') {
      const withParticipants = await prisma.schedule.findUnique({
        where: { id: result.schedule.id },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, nipp: true, role: true } } },
          },
        },
      });
      return res.status(201).json({
        message: `Undangan jadwal berhasil dikirim ke ${result.inviteeCount} pegawai.`,
        schedule: withParticipants,
      });
    }

    return res.status(201).json({ message: 'Jadwal berhasil dibuat.', schedule: result.schedule });
  } catch (error) {
    console.error('createSchedule error:', error);
    return res.status(500).json({ error: 'Gagal membuat jadwal.' });
  }
}

module.exports = {
  getSchedules, createSchedule, getPendingSchedules, approveSchedule, rejectSchedule,
  getIncomingSchedules, respondSchedule, getRecapData, updateScheduleRealization,
  getTidakSesuaiSchedules,
  // Edit/Delete + Change Request Workflow
  updateScheduleDirect, deleteScheduleDirect,
  submitChangeRequest, listPendingChangeRequests, reviewChangeRequest,
};

// Constants & helpers
const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER'];
const isManagementRole = (role) => MANAGEMENT_ROLES.includes(role);

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
    // Sertakan PENDING & RESCHEDULED (user yg pernah ajukan reschedule masih bisa respond ulang)
    const participantRows = await prisma.scheduleParticipant.findMany({
      where: { userId, status: { in: ["PENDING", "RESCHEDULED"] } },
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
    // Sertakan PENDING & RESCHEDULED supaya bisa diakses lagi setelah pernah respond reschedule
    const scheduleRows = await prisma.schedule.findMany({
      where: {
        status: { in: ["PENDING", "RESCHEDULED"] },
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
  const { action, kind, responseNote } = req.body;
  const userId = req.user.id;

  if (!action || !['approve', 'reject', 'reschedule'].includes(action)) {
    return res.status(400).json({ error: 'Aksi harus berupa "approve", "reject", atau "reschedule".' });
  }

  const newStatus =
    action === 'approve' ? 'APPROVED' :
    action === 'reschedule' ? 'RESCHEDULED' :
    'REJECTED';
  const msg =
    action === 'approve' ? 'disetujui' :
    action === 'reschedule' ? 'diajukan reschedule' :
    'ditolak';

  // Trim & sanitize responseNote
  const noteValue = typeof responseNote === 'string' ? responseNote.trim().slice(0, 500) : null;

  try {
    // Auto-detect kind kalau frontend tidak kirim
    let resolvedKind = (kind || '').toUpperCase();
    if (!['PARTICIPANT', 'MEETING', 'DELEGATION'].includes(resolvedKind)) {
      const participantRow = await prisma.scheduleParticipant.findFirst({
        where: { scheduleId, userId },
      });
      resolvedKind = participantRow ? 'PARTICIPANT' : 'MEETING';
    }

    // ==== Cabang PARTICIPANT (group meeting) ====
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
      if (participant.status === 'APPROVED' || participant.status === 'REJECTED') {
        return res.status(400).json({ error: 'Anda sudah merespons undangan ini sebelumnya.' });
      }

      const senderName = participant.schedule?.user?.name || 'Pengundang';
      const recurrenceGroupId = participant.schedule?.recurrenceGroupId;
      const isRecurringSeries = !!recurrenceGroupId && (action === 'approve' || action === 'reject');

      // ===== BULK PATH untuk jadwal rutin (recurring) =====
      if (isRecurringSeries) {
        // Ambil semua participant rows milik user ini dalam group yang sama,
        // termasuk yang masih PENDING atau RESCHEDULED (siap di-respond).
        const allParticipants = await prisma.scheduleParticipant.findMany({
          where: {
            userId,
            status: { in: ['PENDING', 'RESCHEDULED'] },
            schedule: { recurrenceGroupId },
          },
          include: { schedule: true },
        });

        const approvedIds = [];
        const skipped = [];

        for (const p of allParticipants) {
          if (action === 'approve') {
            const conflict = await findApprovedConflict(
              userId,
              p.schedule.start_time,
              p.schedule.end_time,
              p.scheduleId
            );
            if (conflict) {
              skipped.push({ scheduleId: p.scheduleId, reason: 'Bentrok' });
              continue;
            }
          }

          await prisma.scheduleParticipant.update({
            where: { id: p.id },
            data: { status: newStatus, responseNote: noteValue },
          });

          if (action === 'approve') {
            approvedIds.push(p.scheduleId);
            // Naikkan main schedule ke APPROVED kalau semua participants di sched ini APPROVED
            const allP = await prisma.scheduleParticipant.findMany({ where: { scheduleId: p.scheduleId } });
            if (allP.every((x) => x.status === 'APPROVED')) {
              await prisma.schedule.update({
                where: { id: p.scheduleId },
                data: { status: 'APPROVED' },
              });
            }
          }
        }

        const totalProcessed = allParticipants.length - skipped.length;
        let bulkMsg;
        if (action === 'approve') {
          bulkMsg = `${totalProcessed} jadwal rutin dari ${senderName} berhasil disetujui` +
            (skipped.length > 0 ? ` (${skipped.length} dilewati karena bentrok)` : '') + '.';
        } else {
          bulkMsg = `${totalProcessed} jadwal rutin dari ${senderName} berhasil ditolak.`;
        }

        return res.status(200).json({
          message: bulkMsg,
          kind: 'PARTICIPANT',
          bulk: true,
          processed: totalProcessed,
          skipped,
        });
      }

      // ===== SINGLE PATH (jadwal non-recurring atau action reschedule) =====
      if (action === 'approve' && participant.schedule) {
        const conflict = await findApprovedConflict(
          userId,
          participant.schedule.start_time,
          participant.schedule.end_time,
          scheduleId
        );
        if (conflict) {
          return res.status(400).json({
            error: `Jadwal bentrok dengan jadwal lain Anda${conflict.notes ? ` ("${conflict.notes}")` : ''}.`,
          });
        }
      }

      const updated = await prisma.scheduleParticipant.update({
        where: { id: participant.id },
        data: { status: newStatus, responseNote: noteValue },
      });

      if (action === 'approve') {
        const allParticipants = await prisma.scheduleParticipant.findMany({
          where: { scheduleId },
        });
        if (allParticipants.every((p) => p.status === 'APPROVED')) {
          await prisma.schedule.update({
            where: { id: scheduleId },
            data: { status: 'APPROVED' },
          });
        }
      }

      return res.status(200).json({
        message: `Undangan jadwal dari ${senderName} berhasil ${msg}.`,
        participant: updated,
        kind: 'PARTICIPANT',
      });
    }

    // ==== Cabang MEETING legacy (single-target) & DELEGATION ====
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

    if (schedule.status === 'APPROVED' || schedule.status === 'REJECTED') {
      return res.status(400).json({ error: 'Jadwal ini sudah direspons sebelumnya.' });
    }

    const senderName = isOwnerDelegated ? schedule.creator?.name : schedule.user?.name;
    const recurrenceGroupId = schedule.recurrenceGroupId;
    const isRecurringSeries = !!recurrenceGroupId && (action === 'approve' || action === 'reject');

    // ===== BULK PATH untuk MEETING/DELEGATION recurring =====
    if (isRecurringSeries) {
      // Bangun where clause yg mempertahankan relasi user
      const baseWhere = {
        recurrenceGroupId,
        status: { in: ['PENDING', 'RESCHEDULED'] },
      };
      if (isOwnerDelegated) {
        baseWhere.user_id = userId;
        baseWhere.created_by = { not: null };
      } else {
        baseWhere.target_user_id = userId;
      }

      const siblings = await prisma.schedule.findMany({ where: baseWhere });

      const approvedIds = [];
      const skipped = [];

      for (const sib of siblings) {
        if (action === 'approve') {
          const conflict = await findApprovedConflict(userId, sib.start_time, sib.end_time, sib.id);
          if (conflict) {
            skipped.push({ scheduleId: sib.id, reason: 'Bentrok' });
            continue;
          }
        }
        await prisma.schedule.update({
          where: { id: sib.id },
          data: { status: newStatus, responseNote: noteValue },
        });
        if (action === 'approve') approvedIds.push(sib.id);
      }

      const totalProcessed = siblings.length - skipped.length;
      const bulkMsg = action === 'approve'
        ? `${totalProcessed} jadwal rutin dari ${senderName} berhasil disetujui` +
          (skipped.length > 0 ? ` (${skipped.length} dilewati karena bentrok)` : '') + '.'
        : `${totalProcessed} jadwal rutin dari ${senderName} berhasil ditolak.`;

      return res.status(200).json({
        message: bulkMsg,
        kind: isOwnerDelegated ? 'DELEGATION' : 'MEETING',
        bulk: true,
        processed: totalProcessed,
        skipped,
      });
    }

    // ===== SINGLE PATH =====
    if (action === 'approve') {
      const conflict = await findApprovedConflict(userId, schedule.start_time, schedule.end_time, scheduleId);
      if (conflict) {
        return res.status(400).json({
          error: `Jadwal bentrok dengan jadwal lain Anda${conflict.notes ? ` ("${conflict.notes}")` : ''}.`,
        });
      }
    }

    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: newStatus, responseNote: noteValue },
    });
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

/**
 * PUT /api/schedules/:id/realization
 * Mengisi/mengubah evaluasi realisasi sebuah jadwal.
 * Body: { realizationStatus: 'BELUM_DIISI' | 'SESUAI' | 'TIDAK_SESUAI', realizationNotes?: string }
 *
 * Akses: hanya pemilik jadwal (user_id) ATAU role manajemen
 * (SUPER_ADMIN, MANAJER, ASISTEN_MANAJER).
 *
 * Persyaratan tambahan:
 *  - Jadwal harus berstatus APPROVED (belum bisa dievaluasi kalau masih PENDING/REJECTED).
 *  - Waktu akhir jadwal (end_time) sudah lewat (event sudah selesai).
 */
async function updateScheduleRealization(req, res) {
  const scheduleId = parseInt(req.params.id);
  const userId = req.user.id;
  const userRole = req.user.role;
  const { realizationStatus, realizationNotes } = req.body;

  const validStatuses = ['BELUM_DIISI', 'SESUAI', 'TIDAK_SESUAI'];
  if (!realizationStatus || !validStatuses.includes(realizationStatus)) {
    return res.status(400).json({
      error: 'realizationStatus tidak valid. Pilih: BELUM_DIISI, SESUAI, atau TIDAK_SESUAI.',
    });
  }

  // Sanitize note (max 1000 chars)
  const cleanNotes = typeof realizationNotes === 'string'
    ? realizationNotes.trim().slice(0, 1000)
    : null;

  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    }

    // Cek hak akses: pemilik (user_id) atau role manajemen
    const isOwner = schedule.user_id === userId;
    const isManagement = ['SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER'].includes(userRole);
    if (!isOwner && !isManagement) {
      return res.status(403).json({
        error: 'Anda tidak berhak mengisi realisasi untuk jadwal ini.',
      });
    }

    // Cek prasyarat: jadwal harus APPROVED dan sudah selesai
    if (schedule.status !== 'APPROVED') {
      return res.status(400).json({
        error: 'Realisasi hanya bisa diisi untuk jadwal yang sudah disetujui (APPROVED).',
      });
    }
    if (new Date(schedule.end_time) > new Date()) {
      return res.status(400).json({
        error: 'Realisasi hanya bisa diisi setelah waktu akhir jadwal terlewati.',
      });
    }

    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        realizationStatus,
        realizationNotes: cleanNotes,
      },
    });

    return res.status(200).json({
      message: 'Realisasi jadwal berhasil disimpan.',
      schedule: updated,
    });
  } catch (error) {
    console.error('updateScheduleRealization error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan realisasi jadwal.' });
  }
}

/**
 * GET /api/schedules/tidak-sesuai
 * Daftar jadwal milik user yang sudah dievaluasi 'TIDAK_SESUAI'.
 * Dipakai oleh Modal Tambah Jadwal untuk fitur "Jadwalkan Ulang".
 * Hanya kembalikan jadwal yang masih punya keterangan (realizationNotes terisi)
 * agar selaras dengan filter pada tab "Jadwal Tidak Sesuai" di dashboard.
 */
async function getTidakSesuaiSchedules(req, res) {
  const userId = req.user.id;
  try {
    const schedules = await prisma.schedule.findMany({
      where: {
        user_id: userId,
        realizationStatus: 'TIDAK_SESUAI',
        // Sembunyikan jadwal yang sudah pernah dijadwalkan ulang
        hasBeenRescheduled: false,
        NOT: [
          { realizationNotes: null },
          { realizationNotes: '' },
        ],
      },
      select: {
        id: true,
        notes: true,
        category: true,
        start_time: true,
        end_time: true,
        realizationNotes: true,
        user: {
          select: {
            id: true,
            name: true,
            unit: { select: { id: true, unit_name: true } },
          },
        },
      },
      orderBy: { end_time: 'desc' },
    });
    return res.status(200).json(schedules);
  } catch (error) {
    console.error('getTidakSesuaiSchedules error:', error);
    return res.status(500).json({ error: 'Gagal mengambil daftar jadwal Tidak Sesuai.' });
  }
}

// ============================================================================
// EDIT / DELETE WORKFLOW
// ----------------------------------------------------------------------------
// - Role manajemen (SUPER_ADMIN/MANAJER/ASISTEN_MANAJER) → eksekusi langsung
//   via PUT /:id atau DELETE /:id
// - Role bawahan (STAFF/SUPERVISOR/dll) → harus mengajukan via
//   POST /:id/change-request, lalu di-review manajemen.
// ============================================================================

/**
 * PUT /api/schedules/:id — direct edit (management only)
 * Body: { notes?, start_time?, end_time?, category? }
 */
async function updateScheduleDirect(req, res) {
  const userRole = req.user.role;
  if (!isManagementRole(userRole)) {
    return res.status(403).json({
      error: 'Hanya role manajemen yang dapat mengedit langsung. Silakan ajukan perubahan via change-request.',
    });
  }
  const scheduleId = parseInt(req.params.id);
  const { notes, start_time, end_time, category } = req.body;

  try {
    const existing = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!existing) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });

    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    if (start_time) updateData.start_time = new Date(start_time);
    if (end_time) updateData.end_time = new Date(end_time);
    if (category) updateData.category = category;

    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data: updateData,
    });
    return res.status(200).json({ message: 'Jadwal berhasil diperbarui.', schedule: updated });
  } catch (error) {
    console.error('updateScheduleDirect error:', error);
    return res.status(500).json({ error: 'Gagal mengupdate jadwal.' });
  }
}

/**
 * DELETE /api/schedules/:id — direct delete (management only)
 */
async function deleteScheduleDirect(req, res) {
  const userRole = req.user.role;
  if (!isManagementRole(userRole)) {
    return res.status(403).json({
      error: 'Hanya role manajemen yang dapat menghapus langsung. Silakan ajukan penghapusan via change-request.',
    });
  }
  const scheduleId = parseInt(req.params.id);
  try {
    await prisma.schedule.delete({ where: { id: scheduleId } });
    return res.status(200).json({ message: 'Jadwal berhasil dihapus.' });
  } catch (error) {
    console.error('deleteScheduleDirect error:', error);
    return res.status(500).json({ error: 'Gagal menghapus jadwal.' });
  }
}

/**
 * POST /api/schedules/:id/change-request — submit pengajuan perubahan
 * Body untuk EDIT: { type: 'EDIT', proposedNotes?, proposedStartTime?, proposedEndTime?, proposedCategory?, requestNote? }
 * Body untuk DELETE: { type: 'DELETE', requestNote? }
 */
async function submitChangeRequest(req, res) {
  const userId = req.user.id;
  const scheduleId = parseInt(req.params.id);
  const { type, proposedNotes, proposedStartTime, proposedEndTime, proposedCategory, requestNote } = req.body;

  if (!['EDIT', 'DELETE'].includes(type)) {
    return res.status(400).json({ error: 'Type harus EDIT atau DELETE.' });
  }

  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });

    // Pengaju harus punya relasi ke jadwal (owner, target, creator delegasi, atau participant)
    const isOwner = schedule.user_id === userId;
    const isTarget = schedule.target_user_id === userId;
    const isCreator = schedule.created_by === userId;
    let isParticipant = false;
    if (!isOwner && !isTarget && !isCreator) {
      const p = await prisma.scheduleParticipant.findFirst({ where: { scheduleId, userId } });
      isParticipant = !!p;
    }
    if (!isOwner && !isTarget && !isCreator && !isParticipant) {
      return res.status(403).json({ error: 'Anda tidak memiliki hak terhadap jadwal ini.' });
    }

    // Cegah double-submit
    const existing = await prisma.scheduleChangeRequest.findFirst({
      where: { scheduleId, status: 'PENDING' },
    });
    if (existing) {
      return res.status(400).json({
        error: 'Sudah ada pengajuan perubahan yang menunggu review untuk jadwal ini.',
      });
    }

    const cleanNote = typeof requestNote === 'string' ? requestNote.trim().slice(0, 500) : null;
    const data = {
      scheduleId,
      requesterId: userId,
      type,
      status: 'PENDING',
      requestNote: cleanNote,
    };

    if (type === 'EDIT') {
      if (proposedNotes !== undefined && proposedNotes !== null) data.proposedNotes = String(proposedNotes);
      if (proposedStartTime) data.proposedStartTime = new Date(proposedStartTime);
      if (proposedEndTime) data.proposedEndTime = new Date(proposedEndTime);
      if (proposedCategory && ['PRIBADI', 'UNIT', 'BERSAMA'].includes(proposedCategory)) {
        data.proposedCategory = proposedCategory;
      }
      // Validasi: harus ada minimal 1 field yang diubah
      const hasAnyChange =
        data.proposedNotes !== undefined ||
        data.proposedStartTime !== undefined ||
        data.proposedEndTime !== undefined ||
        data.proposedCategory !== undefined;
      if (!hasAnyChange) {
        return res.status(400).json({ error: 'Pengajuan edit harus memuat minimal 1 perubahan field.' });
      }
    }

    const cr = await prisma.scheduleChangeRequest.create({ data });
    return res.status(201).json({
      message: type === 'EDIT'
        ? 'Pengajuan edit jadwal terkirim, menunggu review atasan.'
        : 'Pengajuan hapus jadwal terkirim, menunggu review atasan.',
      changeRequest: cr,
    });
  } catch (error) {
    console.error('submitChangeRequest error:', error);
    return res.status(500).json({ error: 'Gagal mengajukan perubahan.' });
  }
}

/**
 * GET /api/change-requests/pending — list semua pengajuan PENDING (management only)
 */
async function listPendingChangeRequests(req, res) {
  const userRole = req.user.role;
  if (!isManagementRole(userRole)) {
    return res.status(403).json({ error: 'Hanya role manajemen yang dapat melihat antrian pengajuan.' });
  }
  try {
    const requests = await prisma.scheduleChangeRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        requester: { select: { id: true, name: true, nipp: true, role: true, jabatan: true } },
        schedule: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(requests);
  } catch (error) {
    console.error('listPendingChangeRequests error:', error);
    return res.status(500).json({ error: 'Gagal memuat antrian pengajuan.' });
  }
}

/**
 * PATCH /api/change-requests/:id/review — atasan approve/reject (management only)
 * Body: { action: 'approve' | 'reject', reviewNote? }
 *
 * Pada APPROVE:
 *   - EDIT  → apply proposed fields ke schedule, status CR = APPROVED
 *   - DELETE → hapus schedule (cascade-delete CR), tidak ada record CR setelahnya
 * Pada REJECT:
 *   - Status CR = REJECTED, schedule tetap utuh
 */
async function reviewChangeRequest(req, res) {
  const userId = req.user.id;
  const userRole = req.user.role;
  if (!isManagementRole(userRole)) {
    return res.status(403).json({ error: 'Hanya role manajemen yang dapat me-review pengajuan.' });
  }
  const crId = parseInt(req.params.id);
  const { action, reviewNote } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Aksi harus approve atau reject.' });
  }
  const cleanReview = typeof reviewNote === 'string' ? reviewNote.trim().slice(0, 500) : null;

  try {
    const cr = await prisma.scheduleChangeRequest.findUnique({
      where: { id: crId },
      include: { schedule: true, requester: { select: { name: true } } },
    });
    if (!cr) return res.status(404).json({ error: 'Pengajuan tidak ditemukan.' });
    if (cr.status !== 'PENDING') {
      return res.status(400).json({ error: 'Pengajuan ini sudah pernah di-review.' });
    }

    const now = new Date();

    if (action === 'reject') {
      await prisma.scheduleChangeRequest.update({
        where: { id: crId },
        data: { status: 'REJECTED', reviewNote: cleanReview, reviewerId: userId, reviewedAt: now },
      });
      return res.status(200).json({
        message: `Pengajuan ${cr.type === 'EDIT' ? 'edit' : 'hapus'} dari ${cr.requester.name} ditolak.`,
      });
    }

    // Approve path
    if (cr.type === 'EDIT') {
      const updateData = {};
      if (cr.proposedNotes !== null) updateData.notes = cr.proposedNotes;
      if (cr.proposedStartTime) updateData.start_time = cr.proposedStartTime;
      if (cr.proposedEndTime) updateData.end_time = cr.proposedEndTime;
      if (cr.proposedCategory) updateData.category = cr.proposedCategory;

      await prisma.schedule.update({ where: { id: cr.scheduleId }, data: updateData });
      await prisma.scheduleChangeRequest.update({
        where: { id: crId },
        data: { status: 'APPROVED', reviewNote: cleanReview, reviewerId: userId, reviewedAt: now },
      });
      return res.status(200).json({
        message: `Edit dari ${cr.requester.name} disetujui & diterapkan ke jadwal.`,
      });
    }

    if (cr.type === 'DELETE') {
      // Hapus schedule → cascade-delete CR row juga (FK onDelete: Cascade)
      await prisma.schedule.delete({ where: { id: cr.scheduleId } });
      return res.status(200).json({
        message: `Permintaan hapus dari ${cr.requester.name} disetujui & jadwal telah dihapus.`,
      });
    }

    return res.status(400).json({ error: 'Tipe pengajuan tidak dikenali.' });
  } catch (error) {
    console.error('reviewChangeRequest error:', error);
    return res.status(500).json({ error: 'Gagal memproses pengajuan.' });
  }
}
