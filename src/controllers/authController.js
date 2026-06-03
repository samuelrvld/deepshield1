// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/login
// Body: { identifier: "email_atau_username", password: "..." }
// ─────────────────────────────────────────────────────────────────────────────
const loginUser = async (req, res) => {
  try {
    // Perbaikan: Mengambil 'identifier' ATAU 'email' dari req.body
    // Jika Mona mengirim { "email": "..." }, maka userIdentifier akan mengambil nilai tersebut
    const { identifier, email, password } = req.body;
    const userIdentifier = identifier || email;

    // Validasi input
    if (!userIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/username dan password wajib diisi.',
      });
    }

    // Cari user berdasarkan email ATAU username menggunakan userIdentifier
    const [rows] = await pool.query(
      `SELECT id, username, email, password, role
       FROM users
       WHERE email = ? OR username = ?
       LIMIT 1`,
      [userIdentifier, userIdentifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email/username atau password salah.',
      });
    }

    const user = rows[0];

    // Verifikasi password dengan bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email/username atau password salah.',
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      data: {
        token,
        user: {
          id:       user.id,
          username: user.username,
          email:    user.email,
          role:     user.role,
        },
      },
    });

  } catch (err) {
    console.error('[loginUser] Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat login.',
    });
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/register
// Body: { username, email, password }
// ─────────────────────────────────────────────────────────────────────────────
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, dan password wajib diisi.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal 6 karakter.',
      });
    }

    // Cek duplikat
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
      [email, username]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email atau username sudah digunakan.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, "user")',
      [username, email, hashedPassword]
    );

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil. Silakan login.',
      data: { id: result.insertId, username, email },
    });

  } catch (err) {
    console.error('[registerUser] Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat registrasi.',
    });
  }
};

module.exports = { loginUser, registerUser };
