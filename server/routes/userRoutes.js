const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');
const { getUsers, approveUser, rejectUser, createUser, updateUser, deleteUser } = require('../controllers/userController');

// Endpoint publik (diperlukan untuk dropdown saat membuat jadwal)
router.get('/active', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { account_status: 'ACTIVE' },
      select: { id: true, name: true, role: true, nipp: true, unit_id: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Proteksi global (minimal Asisten Manajer untuk bisa GET)
router.use(verifyToken);

router.get('/', verifyRole('SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER'), getUsers);

// Aksi yang bisa dilakukan oleh SUPER_ADMIN & MANAJER
router.put('/:id', verifyRole('SUPER_ADMIN', 'MANAJER'), updateUser);
router.delete('/:id', verifyRole('SUPER_ADMIN', 'MANAJER'), deleteUser);
router.patch('/:id/approve', verifyRole('SUPER_ADMIN', 'MANAJER'), approveUser);
router.delete('/:id/reject', verifyRole('SUPER_ADMIN', 'MANAJER'), rejectUser);

// Aksi yang HANYA bisa dilakukan SUPER_ADMIN
router.post('/', verifyRole('SUPER_ADMIN'), createUser);

module.exports = router;
