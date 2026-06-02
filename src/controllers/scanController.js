// src/controllers/scanController.js
// Berisi 3 fungsi utama:
//   1. loginUser      — Autentikasi + return JWT
//   2. scanDeepfake   — Forward ke FastAPI Crist, simpan ke MySQL, fallback jika AI mati
//   3. downloadReport — Ambil data dari MySQL, kirim sebagai file JSON downloadable

require('dotenv').config();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const axios   = require('axios');
const FormData = require('form-data');
const pool    = require('../config/db');

// ══════════════════════════════════════════════════════════════════════════════
// 1. LOGIN USER
//    POST /api/login
//    Body: { identifier: "email_atau_username", password: "..." }
// ══════════════════════════════════════════════════════════════════════════════
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // ── Validasi input ──────────────────────────────────────────────────────
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/username dan password wajib diisi.',
      });
    }

    // ── Cari user di MySQL (bisa pakai email atau username) ─────────────────
    const [rows] = await pool.query(
      'SELECT id, username, email, password, role FROM users WHERE email = ? OR username = ? LIMIT 1',
      [identifier, identifier]
    );

    if (rows.length === 0) {
      // Pesan generik agar tidak membocorkan info "email tidak terdaftar"
      return res.status(401).json({
        success: false,
        message: 'Email/username atau password salah.',
      });
    }

    const user = rows[0];

    // ── Verifikasi password dengan bcrypt ───────────────────────────────────
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email/username atau password salah.',
      });
    }

    // ── Generate JWT Token ──────────────────────────────────────────────────
    const token = jwt.sign(
      {
        id:       user.id,
        username: user.username,
        email:    user.email,
        role:     user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // ── Kirim respons sukses ────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════════
// 2. SCAN DEEPFAKE
//    POST /api/scan-deepfake
//    Form-Data: key 'image', value: file gambar
//    Middleware: handleUpload (Multer memory storage) + optionalAuth
// ══════════════════════════════════════════════════════════════════════════════
const scanDeepfake = async (req, res) => {
  try {
    // ── Pastikan file ada di request ────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File gambar wajib dikirim dengan key "image".',
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const userId = req.user?.id || null; // null jika belum login (optionalAuth)

    console.log(`[scanDeepfake] Menerima file: ${originalname} (${(size / 1024).toFixed(1)} KB)`);

    // ── Variabel untuk menyimpan hasil ─────────────────────────────────────
    let resultClass;     // 'Real' atau 'Fake'
    let confidence;      // Float 0.0 - 1.0
    let isFallback = false;
    let aiRawResponse = null;

    // ══════════════════════════════════════════════════════════════════════
    // BLOK UTAMA: Forward ke FastAPI Crist di port 8000
    // ══════════════════════════════════════════════════════════════════════
    try {
      // Buat FormData — gunakan buffer dari Multer memory storage
      // Key 'file' sesuai spesifikasi API Crist
      const form = new FormData();
      form.append('file', buffer, {
        filename:    originalname,
        contentType: mimetype,
      });

      console.log(`[scanDeepfake] Mengirim ke AI Server: ${process.env.AI_SERVER_URL}/predict`);

      const aiResponse = await axios.post(
        `${process.env.AI_SERVER_URL}/predict`,
        form,
        {
          headers: {
            ...form.getHeaders(), // Otomatis set Content-Type: multipart/form-data + boundary
          },
          timeout: 30000, // 30 detik timeout — cukup untuk model besar
        }
      );

      // ── Parsing respons dari FastAPI: { "class": "...", "confidence": ... }
      aiRawResponse  = aiResponse.data;
      resultClass    = aiRawResponse.class;
      confidence     = parseFloat(aiRawResponse.confidence);

      console.log(`[scanDeepfake] Hasil AI: class=${resultClass}, confidence=${confidence}`);

    } catch (aiError) {
      // ══════════════════════════════════════════════════════════════════
      // FALLBACK: AI Server Crist tidak dapat dijangkau
      // Kembalikan data simulasi agar Front-End Mona tetap bisa testing
      // ══════════════════════════════════════════════════════════════════
      const isNetworkError = (
        aiError.code === 'ECONNREFUSED'  || // Port tidak terbuka
        aiError.code === 'ENOTFOUND'     || // Host tidak ditemukan
        aiError.code === 'ECONNABORTED'  || // Koneksi terputus
        aiError.code === 'ETIMEDOUT'     || // Timeout
        aiError.response?.status >= 500     // Server error dari FastAPI
      );

      if (isNetworkError) {
        console.warn('[scanDeepfake] ⚠️  AI Server tidak tersedia. Menggunakan data fallback.');
        isFallback  = true;
        resultClass = 'Real';
        confidence  = 0.94;
        aiRawResponse = { fallback: true, reason: aiError.code || 'AI server error' };
      } else {
        // Error lain (misal: response format salah) — lempar ke catch utama
        throw aiError;
      }
    }

    // ── Simpan hasil ke MySQL ───────────────────────────────────────────────
    const [insertResult] = await pool.query(
      `INSERT INTO scan_results
         (user_id, original_filename, result_class, confidence, is_fallback, ai_raw_response)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        originalname || null,
        resultClass,
        confidence,
        isFallback ? 1 : 0,
        JSON.stringify(aiRawResponse),
      ]
    );

    const scanId = insertResult.insertId;
    console.log(`[scanDeepfake] Hasil disimpan ke DB. ID: ${scanId}`);

    // ── Kirim respons ke Front-End React Mona ──────────────────────────────
    return res.status(200).json({
      success:    true,
      message:    isFallback
                    ? 'Scan selesai (mode simulasi — AI server sedang tidak aktif).'
                    : 'Scan deepfake berhasil.',
      data: {
        id:         scanId,
        result:     resultClass,   // 'Real' atau 'Fake'
        confidence: confidence,    // misal: 0.9823
        isFallback: isFallback,
        filename:   originalname,
        scannedAt:  new Date().toISOString(),
      },
    });

  } catch (err) {
    console.error('[scanDeepfake] Error tidak terduga:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat memproses scan.',
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. DOWNLOAD REPORT
//    GET /api/download-report/:id
//    Middleware: protect (JWT wajib)
//    Browser akan otomatis mengunduh file JSON bernama report-[id].json
// ══════════════════════════════════════════════════════════════════════════════
const downloadReport = async (req, res) => {
  try {
    const { id } = req.params;

    // ── Validasi ID ─────────────────────────────────────────────────────────
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID laporan tidak valid.',
      });
    }

    // ── Ambil data dari MySQL ───────────────────────────────────────────────
    const [rows] = await pool.query(
      `SELECT
         sr.id,
         sr.original_filename,
         sr.result_class,
         sr.confidence,
         sr.is_fallback,
         sr.ai_raw_response,
         sr.created_at,
         u.username,
         u.email
       FROM scan_results sr
       LEFT JOIN users u ON sr.user_id = u.id
       WHERE sr.id = ?
       LIMIT 1`,
      [parseInt(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Laporan dengan ID ${id} tidak ditemukan.`,
      });
    }

    const record = rows[0];

    // ── Otorisasi: user biasa hanya bisa download laporan miliknya sendiri ──
    // Admin boleh download semua laporan
    if (req.user.role !== 'admin') {
      // Cek apakah scan ini milik user yang request
      const [ownerCheck] = await pool.query(
        'SELECT user_id FROM scan_results WHERE id = ? LIMIT 1',
        [parseInt(id)]
      );
      if (ownerCheck[0]?.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak. Anda hanya bisa mengunduh laporan milik Anda sendiri.',
        });
      }
    }

    // ── Susun konten laporan ────────────────────────────────────────────────
    const reportContent = {
      report_id:         record.id,
      generated_at:      new Date().toISOString(),
      scan_details: {
        original_filename: record.original_filename,
        scanned_at:        record.created_at,
        result:            record.result_class,
        confidence:        record.confidence,
        confidence_pct:    `${(record.confidence * 100).toFixed(2)}%`,
        is_simulation:     record.is_fallback === 1,
      },
      user: record.username
        ? { username: record.username, email: record.email }
        : { note: 'Scan dilakukan tanpa login' },
      ai_raw_response: (() => {
        try {
          if (typeof record.ai_raw_response === 'string') {
            return JSON.parse(record.ai_raw_response);
          }
          return record.ai_raw_response;
        } catch (err) {
          console.error("[downloadReport] Gagal parse JSON AI:", err);
          return { error: "Data AI mentah tidak dapat diproses", raw: record.ai_raw_response };
        }
      })(),
      // ---------------------------------
    };

    const jsonString = JSON.stringify(reportContent, null, 2);

    // ── Set header agar browser otomatis mengunduh file ─────────────────────
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.json"`);
    res.setHeader('Content-Length', Buffer.byteLength(jsonString, 'utf8'));

    return res.status(200).send(jsonString);

  } catch (err) {
    console.error('[downloadReport] Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengunduh laporan.',
    });
  }
};

module.exports = { loginUser, scanDeepfake, downloadReport };
