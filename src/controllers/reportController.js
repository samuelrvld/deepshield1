// src/controllers/reportController.js
const path = require('path');
const pool = require('../config/db');
const PDFDocument = require('pdfkit');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/download-report/:id
// ─────────────────────────────────────────────────────────────────────────────
const downloadReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'ID laporan tidak valid.',
      });
    }

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

    // Otorisasi
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

    // Parse ai_raw_response
    let aiRaw = null;
    try {
      aiRaw = typeof record.ai_raw_response === 'string'
        ? JSON.parse(record.ai_raw_response)
        : record.ai_raw_response;
    } catch {
      aiRaw = record.ai_raw_response;
    }

    // ── Nilai turunan ──────────────────────────────────────────────────────
    // FIX: confidence di DB adalah desimal (0.9357), harus dikali 100
    const confidencePct = `${parseFloat(record.confidence).toFixed(2)}%`;

    const isReal   = record.result_class?.toUpperCase() === 'REAL';
    const userName = record.username
      ? `${record.username} (${record.email})`
      : 'Guest (tanpa login)';

    const fmt = (date) =>
      new Date(date).toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

    const scannedAt   = fmt(record.created_at);
    const generatedAt = fmt(new Date());

    // Coba ambil explanation dari field manapun di ai_raw_response
    let explanation = null;
    if (aiRaw && typeof aiRaw === 'object') {
      explanation =
        aiRaw.explanation ??
        aiRaw.reason      ??
        aiRaw.message     ??
        aiRaw.detail      ??
        null;
    }

    // ── Setup PDF ──────────────────────────────────────────────────────────
    const doc    = new PDFDocument({ margin: 50, size: 'A4' });
    const pageW  = doc.page.width;   // 595.28
    const pageH  = doc.page.height;  // 841.89
    const margin = 50;
    const cW     = pageW - margin * 2; // content width

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.pdf"`);
    doc.pipe(res);

    // ── Helper: garis horizontal ───────────────────────────────────────────
    const divider = (y, color = '#e2e8f0', weight = 0.75) => {
      doc
        .save()
        .moveTo(margin, y)
        .lineTo(pageW - margin, y)
        .strokeColor(color)
        .lineWidth(weight)
        .stroke()
        .restore();
    };

    // ── Helper: baris label + nilai ────────────────────────────────────────
    const row = (label, value, valueColor = '#1e293b') => {
      const labelW = 150;
      const y      = doc.y;
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#64748b')
        .text(label, margin, y, { width: labelW, lineBreak: false });
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(valueColor)
        .text(value ?? '-', margin + labelW, y, { width: cW - labelW });
      doc.moveDown(0.55);
    };

    // ── HEADER ─────────────────────────────────────────────────────────────
    const logoPath = path.join(__dirname, '../assets/logo.png');
    const logoSize = 52;

    // Logo (skip jika tidak ada)
    try {
      doc.image(logoPath, margin, margin, { width: logoSize, height: logoSize });
    } catch {
      // file logo tidak ditemukan, lanjut tanpa logo
    }

    const titleX = margin + logoSize + 14;

    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#0f172a')
      .text('DeepShield', titleX, margin + 6, { continued: true })
      .fillColor('#0891b2')
      .text(' Detection Report');

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#94a3b8')
      .text('Laporan Hasil Analisis Deepfake Otomatis', titleX, margin + 32);

    // Badge result di pojok kanan header
    const badgeLabel  = isReal ? 'REAL' : 'FAKE';
    const badgeBg     = isReal ? '#dcfce7' : '#fee2e2';
    const badgeText   = isReal ? '#166534' : '#991b1b';
    const badgeX      = pageW - margin - 80;
    const badgeY      = margin + 10;

    doc
      .save()
      .roundedRect(badgeX, badgeY, 78, 26, 5)
      .fillColor(badgeBg)
      .fill()
      .restore();

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(badgeText)
      .text(badgeLabel, badgeX, badgeY + 7, { width: 78, align: 'center' });

    doc.moveDown(4);

    // ── DIVIDER HEADER ─────────────────────────────────────────────────────
    divider(doc.y, '#0891b2', 1.5);
    doc.moveDown(1.2);

    // ── SECTION: INFORMASI LAPORAN ─────────────────────────────────────────
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#94a3b8')
      .text('INFORMASI LAPORAN', margin);

    doc.moveDown(0.7);

    row('Report ID',   `#${record.id}`);
    row('Filename',    record.original_filename);
    row('Result',      record.result_class?.toUpperCase(),
      isReal ? '#059669' : '#dc2626');
    row('Confidence',  confidencePct);
    row('Scanned At',  scannedAt);
    row('User',        userName);
    row('Mode',        record.is_fallback === 1
      ? 'Simulasi (Fallback)' : 'Deteksi Normal');

    doc.moveDown(0.5);
    divider(doc.y);
    doc.moveDown(1.2);

    // ── SECTION: PENJELASAN AI ─────────────────────────────────────────────
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#94a3b8')
      .text('PENJELASAN AI', margin);

    doc.moveDown(0.7);

    if (explanation) {
      doc
        .font('Helvetica')
        .fontSize(10.5)
        .fillColor('#334155')
        .text(explanation, margin, doc.y, {
          width: cW,
          align: 'justify',
          lineGap: 4,
        });
    } else {
      doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor('#94a3b8')
        .text('Tidak ada penjelasan yang tersedia dari AI.', margin);
    }

    doc.moveDown(1.2);
    divider(doc.y);
    doc.moveDown(1.2);

    // ── SECTION: RAW AI RESPONSE ───────────────────────────────────────────
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#94a3b8')
      .text('RAW AI RESPONSE', margin);

    doc.moveDown(0.6);

    // Kotak abu muda sebagai background kode
    const rawText = JSON.stringify(aiRaw, null, 2) ?? 'null';
    const rawH    = Math.min(
      doc.heightOfString(rawText, { width: cW, font: 'Courier', fontSize: 7.5 }) + 20,
      200 // batas tinggi agar tidak melebihi halaman
    );

    doc
      .save()
      .roundedRect(margin, doc.y, cW, rawH, 4)
      .fillColor('#f8fafc')
      .fill()
      .restore();

    doc
      .font('Courier')
      .fontSize(7.5)
      .fillColor('#475569')
      .text(rawText, margin + 10, doc.y + 10, {
        width: cW - 20,
        lineGap: 1,
        height: rawH - 14,
        ellipsis: true,
      });

    // ── FOOTER ─────────────────────────────────────────────────────────────
    const footerY = pageH - 48;

    divider(footerY, '#e2e8f0', 0.5);

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        `Generated by DeepShield  ·  ${generatedAt}`,
        margin,
        footerY + 10,
        { width: cW, align: 'center' }
      );

    // ── SELESAI ─────────────────────────────────────────────────────────────
    doc.end();
    console.log('[downloadReport] PDF berhasil digenerate untuk ID:', id);
    return;

  } catch (err) {
    console.error('[downloadReport] Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengunduh laporan.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/history  —  TIDAK DIUBAH
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
        history: rows,
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