const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

/**
 * POST /api/auth/login
 * Autentikasi user berdasarkan email/NIPP dan password
 */
async function login(req, res) {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/NIPP dan password wajib diisi.' });
  }

  try {
    // Cari user berdasarkan email ATAU nipp
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { nipp: identifier },
        ],
      },
      include: {
        unit: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Akun tidak ditemukan. Periksa kembali Email atau NIPP Anda.' });
    }

    // Validasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Kata sandi yang Anda masukkan salah.' });
    }

    // Cek status akun
    if (user.account_status === 'PENDING') {
      return res.status(403).json({
        error: 'Akun Anda masih menunggu persetujuan Administrator. Silakan hubungi Admin untuk aktivasi.',
      });
    }

    if (user.account_status === 'INACTIVE') {
      return res.status(403).json({
        error: 'Akun Anda telah dinonaktifkan. Hubungi Administrator untuk informasi lebih lanjut.',
      });
    }

    // Buat JWT token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    // Kirim response (tanpa password)
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      message: 'Login berhasil!',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat memproses login.' });
  }
}

/**
 * POST /api/auth/register
 * Pendaftaran pegawai baru (role: USER, status: PENDING)
 */
async function register(req, res) {
  const { nipp, name, email, password, unit_id, role, jabatan } = req.body;

  if (!nipp || !name || !email || !password) {
    return res.status(400).json({ error: 'NIPP, Nama, Email, dan Password wajib diisi.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
  }

  // Validasi role jika ada
  const validRoles = ['MANAJER', 'ASISTEN_MANAJER', 'SUPERVISOR', 'STAFF'];
  const assignedRole = (role && validRoles.includes(role)) ? role : 'STAFF';

  try {
    // Cek duplikasi NIPP
    const existingNipp = await prisma.user.findUnique({ where: { nipp } });
    if (existingNipp) {
      return res.status(409).json({ error: 'NIPP sudah terdaftar di sistem.' });
    }

    // Cek duplikasi Email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email sudah digunakan oleh akun lain.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan ke database
    const newUser = await prisma.user.create({
      data: {
        nipp,
        name,
        email,
        password: hashedPassword,
        role: assignedRole,
        jabatan: jabatan || null,
        account_status: 'PENDING',
        ...(unit_id ? { unit_id: parseInt(unit_id) } : {}),
      },
    });

    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      message: 'Pendaftaran berhasil! Akun Anda akan diaktifkan setelah disetujui oleh Administrator.',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat memproses pendaftaran.' });
  }
}

module.exports = { login, register };
