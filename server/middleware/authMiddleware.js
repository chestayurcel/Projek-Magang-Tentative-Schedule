const jwt = require('jsonwebtoken');

/**
 * Middleware: Verifikasi Token JWT
 * Mengekstrak token dari header Authorization: Bearer <token>
 * Jika valid, payload user disuntikkan ke req.user
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token tidak valid atau telah kedaluwarsa.' });
  }
}

/**
 * Middleware: Verifikasi Role
 * Menerima daftar role yang diizinkan, misal: verifyRole('ADMIN', 'SUPER_ADMIN')
 * Harus dipanggil SETELAH verifyToken agar req.user sudah terisi
 */
function verifyRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Anda tidak memiliki hak akses untuk operasi ini.',
      });
    }
    next();
  };
}

module.exports = { verifyToken, verifyRole };
