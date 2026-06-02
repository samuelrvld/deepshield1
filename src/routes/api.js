// src/routes/api.js
// Mendaftarkan semua endpoint API DeepShield beserta middleware-nya.
//
// Daftar endpoint:
//   GET    /api/health                → cek status server
//   POST   /api/register             → daftar akun baru
//   POST   /api/login                → login, return JWT
//   POST   /api/scan-deepfake        → upload gambar, deteksi deepfake
//   GET    /api/history              → riwayat scan milik user (wajib login)
//   GET    /api/download-report/:id  → download laporan sebagai file JSON

const express = require('express');
const router  = express.Router();

// ─── Controllers ──────────────────────────────────────────────────────────────
const { loginUser, registerUser }      = require('../controllers/authController');
const { scanDeepfake }                 = require('../controllers/predictController');
const { downloadReport, getScanHistory } = require('../controllers/reportController');

// ─── Middleware ───────────────────────────────────────────────────────────────
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { handleUpload }          = require('../middleware/uploadMiddleware');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/health
// Cek apakah server berjalan — tidak butuh auth
// ─────────────────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.status(200).json({
    success:   true,
    message:   '🛡️ DeepShield Backend berjalan normal.',
    timestamp: new Date().toISOString(),
    version:   '1.0.0',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/register
// Body JSON: { username, email, password }
// Tidak butuh auth
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', registerUser);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/login
// Body JSON: { identifier: "email_atau_username", password }
// Tidak butuh auth — endpoint untuk mendapatkan token
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', loginUser);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/scan-deepfake
// Form-Data: key 'image', value: file gambar (JPG/PNG/WEBP, maks 10 MB)
//
// Urutan middleware:
//   1. optionalAuth  → baca JWT jika ada (catat user_id), tapi TIDAK wajib
//   2. handleUpload  → Multer memory storage, kunci field 'image'
//   3. scanDeepfake  → forward ke FastAPI Crist, simpan ke MySQL
// ─────────────────────────────────────────────────────────────────────────────
router.post('/scan-deepfake', optionalAuth, handleUpload, scanDeepfake);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/history
// Header: Authorization: Bearer <token>
// Query params: ?page=1&limit=10
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history', protect, getScanHistory);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/download-report/:id
// Header: Authorization: Bearer <token>
//
// Urutan middleware:
//   1. protect        → JWT WAJIB ada dan valid
//   2. downloadReport → ambil dari MySQL, kirim sebagai file unduhan
// ─────────────────────────────────────────────────────────────────────────────
router.get('/download-report/:id', protect, downloadReport);

module.exports = router;
