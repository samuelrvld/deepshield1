// src/middleware/authMiddleware.js
// Middleware untuk memverifikasi JWT Token pada route yang membutuhkan autentikasi.
// Gunakan sebagai: router.get('/protected', protect, controllerFn)

const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  // Ambil token dari header Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Token tidak ditemukan.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Sisipkan data user ke dalam req agar bisa diakses controller
    req.user = {
      id:       decoded.id,
      username: decoded.username,
      email:    decoded.email,
      role:     decoded.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token sudah kedaluwarsa. Silakan login ulang.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid.',
    });
  }
};

// Middleware opsional: token dibaca jika ada, tapi tidak wajib
// Berguna untuk endpoint publik yang ingin mencatat user jika sedang login
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { protect, optionalAuth };
