const express = require('express');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');
const { getUnits, createUnit, updateUnit, deleteUnit } = require('../controllers/unitController');

// GET public route untuk form registrasi
router.get('/', getUnits);

// Proteksi semua rute di bawah ini agar hanya diakses Admin
router.use(verifyToken);
router.use(verifyRole('SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER'));

router.post('/', createUnit);
router.put('/:id', updateUnit);
router.delete('/:id', deleteUnit);

module.exports = router;
