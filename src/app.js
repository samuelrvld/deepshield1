// src/app.js
// Entry point utama aplikasi DeepShield Backend.
// Menginisialisasi Express, mengaktifkan semua middleware global,
// mendaftarkan router, dan menjalankan server.

require('dotenv').config(); // Harus dipanggil paling pertama

const express    = require('express');
const cors       = require('cors');
const scanRoutes = require('./routes/api'); // Ubah 'scanRoutes' menjadi 'api'

const app  = express();
const PORT = process.env.PORT || 3000;

// ══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE GLOBAL
// ══════════════════════════════════════════════════════════════════════════════

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    // Daftar origin yang diizinkan (ambil dari env atau default)
    // Kita buat daftar array agar mudah dikelola
    const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173,https://deepshield.app').split(',');
    
    // Izinkan request jika:
    // 1. Tidak ada origin (misalnya request dari Postman/cURL)
    // 2. Origin ada di dalam daftar yang diizinkan
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy: Origin not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Tambahkan ini jika kamu nanti menggunakan cookies/session
}));

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Semua endpoint terdaftar di bawah prefix /api
// Contoh: POST /api/scan-deepfake, POST /api/login, dst.
app.use('/api', scanRoutes);

// ─── Root endpoint (informasi cepat) ─────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    project:  'DeepShield Backend',
    version:  '1.0.0',
    status:   'running',
    docs:     'Lihat README.md untuk panduan penggunaan API.',
    endpoints: {
      health:         'GET  /api/health',
      login:          'POST /api/login',
      scan:           'POST /api/scan-deepfake',
      downloadReport: 'GET  /api/download-report/:id',
    },
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER
// Menangkap semua error yang tidak ditangani di controller/middleware
// ══════════════════════════════════════════════════════════════════════════════
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[Global Error Handler]', err.stack || err.message);

  const status  = err.statusCode || err.status || 500;
  const message = err.message    || 'Terjadi kesalahan yang tidak terduga.';

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── 404 Handler — harus di paling akhir ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route '${req.method} ${req.originalUrl}' tidak ditemukan.`,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// JALANKAN SERVER
// ══════════════════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🛡️  DeepShield Backend                 ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Port    : ${PORT}                           ║`);
  console.log(`║  Mode    : ${(process.env.NODE_ENV || 'development').padEnd(30)} ║`);
  console.log(`║  URL     : http://localhost:${PORT}            ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});

module.exports = app; // Untuk testing
