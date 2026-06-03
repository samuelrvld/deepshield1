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
// Izinkan request dari Front-End React Mona.
// Untuk production, ganti origin dengan URL spesifik: 'https://deepshield.app'
app.use(cors({
  origin:  process.env.NODE_ENV === 'production'
             ? process.env.ALLOWED_ORIGIN || 'https://deepshield.app'
             : '*',  // Development: izinkan semua origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── JSON & URL-encoded Body Parser ──────────────────────────────────────────
// Dibutuhkan untuk membaca req.body pada endpoint login
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request Logger (hanya di development) ───────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

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