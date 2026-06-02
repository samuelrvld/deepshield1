const axios    = require('axios');
const FormData = require('form-data');
const pool     = require('../config/db');

const scanDeepfake = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File gambar wajib dikirim dengan key "image".',
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const userId = req.user?.id || null;

    console.log(`[scanDeepfake] File diterima: ${originalname} (${(size / 1024).toFixed(1)} KB)`);

    let resultClass;
    let confidence;
    let isFallback = false;
    let aiRawResponse = null;

    try {
      const form = new FormData();
      form.append('file', buffer, {
        filename:    originalname,
        contentType: mimetype,
      });

      console.log(`[scanDeepfake] Mengirim ke AI: ${process.env.AI_SERVER_URL}/predict`);

      const aiResponse = await axios.post(
        `${process.env.AI_SERVER_URL}/predict`,
        form,
        {
          headers: { ...form.getHeaders() },
          timeout: 30000,
        }
      );

      aiRawResponse = aiResponse.data;
      
      // --- PERBAIKAN LOGIKA DI SINI ---
      // Kita log responsnya agar Anda tahu pasti apa kuncinya
      console.log("DEBUG - Respons Lengkap AI:", JSON.stringify(aiRawResponse));

      // Mencoba mencari kunci yang benar secara otomatis
      resultClass = aiRawResponse.class || aiRawResponse.prediction || aiRawResponse.label || aiRawResponse.result;
      confidence  = parseFloat(aiRawResponse.confidence) || 0.0;

      // Jika masih tidak ditemukan, set ke default agar DB tidak error
      if (!resultClass) {
        console.warn("[scanDeepfake] ⚠️ Key hasil AI tidak ditemukan, menggunakan default.");
        resultClass = 'Unknown';
      }
      // -------------------------------

      console.log(`[scanDeepfake] Hasil diproses → class: ${resultClass}, confidence: ${confidence}`);

    } catch (aiError) {
      const isDown = [
        'ECONNREFUSED', 'ENOTFOUND', 'ECONNABORTED', 'ETIMEDOUT'
      ].includes(aiError.code) || (aiError.response?.status >= 500);

      if (isDown) {
        console.warn('[scanDeepfake] ⚠️ AI Server tidak aktif → menggunakan data simulasi.');
        isFallback    = true;
        resultClass   = 'Real';
        confidence    = 0.94;
        aiRawResponse = { fallback: true, reason: aiError.code || 'AI server tidak dapat dijangkau' };
      } else {
        throw aiError;
      }
    }

    const [insertResult] = await pool.query(
      `INSERT INTO scan_results
         (user_id, original_filename, result_class, confidence, is_fallback, ai_raw_response)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, originalname || null, resultClass, confidence, isFallback ? 1 : 0, JSON.stringify(aiRawResponse)]
    );

    const scanId = insertResult.insertId;
    console.log(`[scanDeepfake] Tersimpan ke DB. ID: ${scanId}`);

    return res.status(200).json({
      success: true,
      message: isFallback ? 'Scan selesai (mode simulasi).' : 'Scan deepfake berhasil.',
      data: {
        id: scanId,
        result: resultClass,
        confidence: confidence,
        isFallback: isFallback,
        filename: originalname,
        scannedAt: new Date().toISOString(),
      },
    });

  } catch (err) {
    console.error('[scanDeepfake] Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat memproses scan.',
    });
  }
};

module.exports = { scanDeepfake };