const express = require('express');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');
const { getSchedules, createSchedule, getPendingSchedules, approveSchedule, rejectSchedule, getIncomingSchedules, respondSchedule } = require('../controllers/scheduleController');

// GET /api/schedules?view=GLOBAL|MY
router.get('/', verifyToken, getSchedules);

// GET /api/schedules/pending (Admin only)
router.get('/pending', verifyToken, verifyRole('SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER'), getPendingSchedules);

// GET /api/schedules/incoming (Undangan jadwal untuk user yang login)
router.get('/incoming', verifyToken, getIncomingSchedules);

// POST /api/schedules
router.post('/', verifyToken, createSchedule);

// PATCH /api/schedules/:id/approve (Admin only)
router.patch('/:id/approve', verifyToken, verifyRole('SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER'), approveSchedule);

// PATCH /api/schedules/:id/reject (Admin only)
router.patch('/:id/reject', verifyToken, verifyRole('SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER'), rejectSchedule);

// PATCH /api/schedules/:id/respond (User target menyetujui/menolak undangan)
router.patch('/:id/respond', verifyToken, respondSchedule);

module.exports = router;
