const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Ambil semua user beserta unitnya
// SUPER_ADMIN hanya ditampilkan jika yang request juga SUPER_ADMIN
async function getUsers(req, res) {
  try {
    const requestingRole = req.user.role;
    const whereClause = requestingRole === 'SUPER_ADMIN'
      ? {} // SUPER_ADMIN melihat semuanya
      : { role: { not: 'SUPER_ADMIN' } }; // Non-SA tidak melihat SA

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        unit: { select: { unit_name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Hilangkan password dari response
    const sanitizedUsers = users.map(user => {
      const { password, ...rest } = user;
      return rest;
    });

    res.json(sanitizedUsers);
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ error: 'Gagal mengambil data pegawai' });
  }
}

// Tambah user baru (Hanya SUPER_ADMIN)
async function createUser(req, res) {
  const { nipp, name, email, password, role, unit_id, jabatan } = req.body;

  try {
    // Proteksi: Pastikan hanya SUPER_ADMIN yang bisa membuat user baru via endpoint ini
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Hanya Super Admin yang dapat menambahkan pegawai secara langsung.' });
    }

    if (!nipp || !name || !email || !password) {
      return res.status(400).json({ error: 'NIPP, Nama, Email, dan Password wajib diisi.' });
    }

    const existingNipp = await prisma.user.findUnique({ where: { nipp } });
    if (existingNipp) return res.status(409).json({ error: 'NIPP sudah terdaftar.' });

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) return res.status(409).json({ error: 'Email sudah terdaftar.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const validRoles = ['SUPER_ADMIN', 'MANAJER', 'ASISTEN_MANAJER', 'SUPERVISOR', 'STAFF'];
    const assignedRole = (role && validRoles.includes(role)) ? role : 'STAFF';

    const newUser = await prisma.user.create({
      data: {
        nipp,
        name,
        email,
        password: hashedPassword,
        role: assignedRole,
        jabatan: jabatan || null,
        account_status: 'ACTIVE', // Langsung aktif jika ditambah via Admin
        ...(unit_id ? { unit_id: parseInt(unit_id) } : {}),
      }
    });

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ message: 'Pegawai berhasil ditambahkan.', user: userWithoutPassword });
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({ error: 'Gagal menambahkan pegawai.' });
  }
}

// Update data user (SUPER_ADMIN & MANAJER)
async function updateUser(req, res) {
  const { id } = req.params;
  const { nipp, name, email, password, role, unit_id, jabatan } = req.body;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!targetUser) return res.status(404).json({ error: 'User tidak ditemukan.' });

    // Proteksi: Hanya SUPER_ADMIN yang boleh mengedit SUPER_ADMIN
    if (targetUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Anda tidak memiliki hak untuk mengedit akun Super Admin.' });
    }

    // Persiapkan data update
    const updateData = {
      name,
      email,
      nipp,
      jabatan: jabatan || null,
      ...(unit_id ? { unit_id: parseInt(unit_id) } : { unit_id: null })
    };

    if (role) {
      // Pastikan MANAJER tidak bisa mengubah role seseorang menjadi SUPER_ADMIN
      if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Anda tidak memiliki hak untuk memberikan role Super Admin.' });
      }
      updateData.role = role;
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({ message: 'Data pegawai berhasil diperbarui.', user: userWithoutPassword });
  } catch (error) {
    console.error('updateUser error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'NIPP atau Email sudah digunakan oleh pengguna lain.' });
    }
    res.status(500).json({ error: 'Gagal memperbarui data pegawai.' });
  }
}

// Hapus user secara permanen
async function deleteUser(req, res) {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Proteksi: Hanya SUPER_ADMIN yang boleh menghapus SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Anda tidak memiliki hak untuk menghapus akun Super Admin.' });
    }

    await prisma.user.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'User berhasil dihapus dari sistem.' });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ error: 'Gagal menghapus user.' });
  }
}

// Setujui user (ubah status jadi ACTIVE)
async function approveUser(req, res) {
  const { id } = req.params;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!targetUser) return res.status(404).json({ error: 'User tidak ditemukan' });

    if (targetUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Anda tidak memiliki hak untuk mengelola akun Super Admin.' });
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { account_status: 'ACTIVE' },
      select: { id: true, name: true, account_status: true }
    });
    res.json({ message: 'User berhasil disetujui', user: updated });
  } catch (error) {
    console.error('approveUser error:', error);
    res.status(500).json({ error: 'Gagal menyetujui user' });
  }
}

// Tolak user registrasi (Sama dengan hapus)
async function rejectUser(req, res) {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Anda tidak memiliki hak untuk menghapus akun Super Admin.' });
    }

    await prisma.user.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'User berhasil ditolak dan dihapus' });
  } catch (error) {
    console.error('rejectUser error:', error);
    res.status(500).json({ error: 'Gagal menolak user' });
  }
}

module.exports = { getUsers, createUser, updateUser, deleteUser, approveUser, rejectUser };
