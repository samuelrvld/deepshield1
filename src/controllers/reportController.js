// src/controllers/reportController.js
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/download-report/:id
// Header wajib: Authorization: Bearer <token>
// Browser otomatis mengunduh file bernama report-[id].json
// ─────────────────────────────────────────────────────────────────────────────
const downloadReport = async (req, res) => {
  try {
    const { id } = req.params;

    // Validasi ID harus angka
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID laporan tidak valid.',
      });
    }

    // Ambil data dari MySQL + join ke tabel users
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

    // Otorisasi: user biasa hanya bisa download laporan miliknya
    // Admin bisa download semua laporan
    if (req.user.role !== 'admin') {
      const [ownerCheck] = await pool.query(
        'SELECT user_id FROM scan_results WHERE id = ? LIMIT 1',
        [parseInt(id)]
      );
      if (ownerCheck[0]?.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak. Kamu hanya bisa mengunduh laporan milikmu sendiri.',
        });
      }
    }

    // Parse ai_raw_response dari string JSON ke object
    let aiRaw = null;
    try {
      aiRaw = typeof record.ai_raw_response === 'string'
        ? JSON.parse(record.ai_raw_response)
        : record.ai_raw_response;
    } catch {
      aiRaw = record.ai_raw_response;
    }

    // Susun isi laporan
    const reportContent = {
      report_id:    record.id,
      generated_at: new Date().toISOString(),
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
      ai_raw_response: aiRaw,
    };

    const jsonString = JSON.stringify(reportContent, null, 2);

    // Set header agar browser otomatis mengunduh file
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/history
// Ambil semua riwayat scan milik user yang login
// ─────────────────────────────────────────────────────────────────────────────
const getScanHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT id, original_filename, result_class, confidence, is_fallback, created_at
       FROM scan_results
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM scan_results WHERE user_id = ?',
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        history:    rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });

  } catch (err) {
    console.error('[getScanHistory] Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengambil riwayat scan.',
    });
  }
};

module.exports = { downloadReport, getScanHistory };
