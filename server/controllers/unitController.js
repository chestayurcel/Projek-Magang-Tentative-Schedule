const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUnits(req, res) {
  try {
    const units = await prisma.unit.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(units);
  } catch (error) {
    console.error('getUnits error:', error);
    res.status(500).json({ error: 'Gagal mengambil data unit' });
  }
}

async function createUnit(req, res) {
  const { unit_name } = req.body;
  if (!unit_name) return res.status(400).json({ error: 'Nama unit wajib diisi' });

  try {
    const newUnit = await prisma.unit.create({
      data: { unit_name }
    });
    res.status(201).json({ message: 'Unit berhasil dibuat', unit: newUnit });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Nama unit sudah digunakan' });
    }
    console.error('createUnit error:', error);
    res.status(500).json({ error: 'Gagal membuat unit' });
  }
}

async function updateUnit(req, res) {
  const { id } = req.params;
  const { unit_name } = req.body;

  if (!unit_name) return res.status(400).json({ error: 'Nama unit wajib diisi' });

  try {
    const updated = await prisma.unit.update({
      where: { id: parseInt(id) },
      data: { unit_name }
    });
    res.json({ message: 'Unit berhasil diperbarui', unit: updated });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Nama unit sudah digunakan' });
    }
    console.error('updateUnit error:', error);
    res.status(500).json({ error: 'Gagal memperbarui unit' });
  }
}

async function deleteUnit(req, res) {
  const { id } = req.params;

  try {
    // Pengecekan anggota aktif
    const unit = await prisma.unit.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!unit) {
      return res.status(404).json({ error: 'Unit tidak ditemukan' });
    }

    if (unit._count.users > 0) {
      return res.status(400).json({ error: 'Gagal: Unit masih memiliki anggota aktif' });
    }

    await prisma.unit.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Unit berhasil dihapus' });
  } catch (error) {
    console.error('deleteUnit error:', error);
    res.status(500).json({ error: 'Gagal menghapus unit' });
  }
}

module.exports = { getUnits, createUnit, updateUnit, deleteUnit };
