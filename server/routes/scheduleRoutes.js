const express = require('express');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');
const {
  getSchedules, createSchedule, getPendingSchedules, approveSchedule, rejectSchedule,
  getIncomingSchedules, respondSchedule, getRecapData, updateScheduleRealization,
  getTidakSesuaiSchedules,
  updateScheduleDirect, deleteScheduleDirect,
  submitChangeRequest, listPendingChangeRequests, reviewChangeRequest,
} = require('../controllers/scheduleController');

// GET /api/schedules?view=GLOBAL|MY
router.get('/', verifyToken, getSchedules);

// GET /api/schedules/pending (Admin only)
router.get('/pending', verifyToken, verifyRole('SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER'), getPendingSchedules);

// GET /api/schedules/incoming (Undangan jadwal untuk user yang login)
router.get('/incoming', verifyToken, getIncomingSchedules);

// GET /api/schedules/recap (Rekapitulasi jadwal untuk role manajemen)
router.get('/recap', verifyToken, verifyRole('SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER'), getRecapData);

// GET /api/schedules/tidak-sesuai (Daftar jadwal lampau user yg dievaluasi 'Tidak Sesuai',
// untuk fitur reschedule di Modal Tambah Jadwal)
router.get('/tidak-sesuai', verifyToken, getTidakSesuaiSchedules);

// POST /api/schedules
router.post('/', verifyToken, createSchedule);

// PATCH /api/schedules/:id/approve (Admin only)
router.patch('/:id/approve', verifyToken, verifyRole('SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER'), approveSchedule);

// PATCH /api/schedules/:id/reject (Admin only)
router.patch('/:id/reject', verifyToken, verifyRole('SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER'), rejectSchedule);

// PATCH /api/schedules/:id/respond (User target menyetujui/menolak undangan)
router.patch('/:id/respond', verifyToken, respondSchedule);

// PUT /api/schedules/:id/realization (Pemilik atau Manajemen mengisi realisasi kegiatan)
router.put('/:id/realization', verifyToken, updateScheduleRealization);

// === Edit / Delete Workflow ===
// PUT /api/schedules/:id — direct edit (management only, role check di controller)
router.put('/:id', verifyToken, updateScheduleDirect);
// DELETE /api/schedules/:id — direct delete (management only, role check di controller)
router.delete('/:id', verifyToken, deleteScheduleDirect);
// POST /api/schedules/:id/change-request — staff/supervisor ajukan EDIT atau DELETE
router.post('/:id/change-request', verifyToken, submitChangeRequest);
// GET /api/schedules/change-requests/pending — antrian pengajuan utk manajemen
router.get('/change-requests/pending', verifyToken, listPendingChangeRequests);
// PATCH /api/schedules/change-requests/:id/review — manajemen approve/reject
router.patch('/change-requests/:id/review', verifyToken, reviewChangeRequest);

module.exports = router;
