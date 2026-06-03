const express = require('express');
const router = express.Router();

const auth = require('../controllers/authController');
const predict = require('../controllers/predictController');
const report = require('../controllers/reportController');

const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { handleUpload } = require('../middleware/uploadMiddleware');

// --- DEBUGGING: Menampilkan isi controller di terminal ---
console.log('DEBUG: authController =', auth);
console.log('DEBUG: predictController =', predict);
console.log('DEBUG: reportController =', report);

// Route
router.get('/health', (req, res) => res.status(200).json({ success: true }));

// Memanggil fungsi dari objek yang diimpor
router.post('/register', auth.registerUser);
router.post('/login', auth.loginUser);
router.post('/scan-deepfake', optionalAuth, handleUpload, predict.scanDeepfake);
router.get('/history', protect, report.getScanHistory);
router.get('/download-report/:id', protect, report.downloadReport);

module.exports = router;