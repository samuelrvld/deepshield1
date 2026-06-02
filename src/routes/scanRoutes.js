// src/routes/scanRoutes.js
// Mendaftarkan semua route API DeepShield beserta middleware-nya.
//
// Ringkasan endpoint:
//   POST   /api/login                    — Login, return JWT
//   POST   /api/scan-deepfake            — Upload gambar, deteksi deepfake
//   GET    /api/download-report/:id      — Download laporan sebagai file JSON
//   GET    /api/health                   — Cek status server (tanpa auth)

const express  = require('express');
const router   = express.Router();

// ─── Controllers ─────────────────────────────────────────────────────────────
const { loginUser, scanDeepfake, downloadReport } = require('../controllers/scanController');

// ─── Middleware ───────────────────────────────────────────────────────────────
const { handleUpload }           = require('../middleware/uploadMiddleware');
const { protect, optionalAuth }  = require('../middleware/authMiddleware');

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/login
// Body: { identifier: "email_atau_username", password: "..." }
// Tidak butuh auth — ini endpoint untuk mendapatkan token
// ══════════════════════════════════════════════════════════════════════════════
router.post('/login', loginUser);

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/scan-deepfake
// Form-Data: key 'image', value: file gambar (JPG/PNG/WEBP, max 10 MB)
//
// Urutan middleware:
//   1. optionalAuth   → baca JWT jika ada (untuk catat user_id), tapi tidak wajib
//   2. handleUpload   → Multer memory storage, kunci field 'image'
//   3. scanDeepfake   → proses deteksi, forward ke FastAPI, simpan ke MySQL
// ══════════════════════════════════════════════════════════════════════════════
router.post('/scan-deepfake', optionalAuth, handleUpload, scanDeepfake);

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/download-report/:id
// Header: Authorization: Bearer <token>
//
// Urutan middleware:
//   1. protect        → JWT WAJIB ada dan valid
//   2. downloadReport → ambil dari MySQL, kirim sebagai file unduhan
// ══════════════════════════════════════════════════════════════════════════════
router.get('/download-report/:id', protect, downloadReport);

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/health
// Endpoint publik untuk cek apakah server berjalan
// Berguna untuk monitoring / debugging dari Front-End
// ══════════════════════════════════════════════════════════════════════════════
router.get('/health', (req, res) => {
  res.status(200).json({
    success:   true,
    message:   '🛡️ DeepShield Backend berjalan normal.',
    timestamp: new Date().toISOString(),
    version:   '1.0.0',
  });
});

module.exports = router;
