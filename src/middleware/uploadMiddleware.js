// src/middleware/uploadMiddleware.js
// Multer dengan Memory Storage — file TIDAK disimpan ke disk,
// melainkan langsung tersedia di req.file.buffer (Buffer object).
// Ini ideal untuk diteruskan langsung ke API FastAPI Crist.

const multer = require('multer');

// ─── Memory Storage ───────────────────────────────────────────────────────
// File tersimpan di RAM sementara, bukan di disk.
// req.file.buffer berisi binary data file yang siap di-forward.
const storage = multer.memoryStorage();

// ─── File Filter — Hanya terima gambar ───────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true); // Terima file
  } else {
    // Tolak file dan kirim error ke error handler Express
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `Format file tidak didukung: ${file.mimetype}. Gunakan JPG, PNG, WEBP, atau GIF.`
      ),
      false
    );
  }
};

// ─── Instance Multer ──────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Maksimal 10 MB
  },
});

// ─── Export sebagai middleware siap pakai ─────────────────────────────────
// Kunci field name 'image' sesuai yang dikirim Front-End React Mona
const uploadImage = upload.single('image');

// Wrapper untuk menangani error Multer dengan format respons yang konsisten
const handleUpload = (req, res, next) => {
  uploadImage(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'Ukuran file terlalu besar. Maksimal 10 MB.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(415).json({
          success: false,
          message: err.field || 'Format file tidak didukung.',
        });
      }
    }

    // Error lainnya
    return res.status(400).json({
      success: false,
      message: err.message || 'Gagal memproses file upload.',
    });
  });
};

module.exports = { handleUpload };
