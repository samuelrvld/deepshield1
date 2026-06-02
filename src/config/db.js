// src/config/db.js
// Koneksi MySQL menggunakan createPool dari mysql2/promise
// Mendukung async/await di seluruh aplikasi

require('dotenv').config();
const mysql = require('mysql2/promise');

// ─── Buat Connection Pool ──────────────────────────────────────────────────
// Pool lebih efisien daripada single connection karena:
// - Mengelola banyak koneksi sekaligus
// - Otomatis recycle koneksi yang sudah selesai dipakai
// - Tidak perlu manually connect/disconnect di setiap query
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'deepshield_db',
  waitForConnections: true,   // Tunggu jika semua koneksi sedang dipakai
  connectionLimit:    10,     // Maksimal 10 koneksi paralel
  queueLimit:         0,      // 0 = antrian tidak dibatasi
  timezone:           '+07:00', // WIB
});

// ─── Test Koneksi saat Pertama Kali Dipakai ───────────────────────────────
pool.getConnection()
  .then((conn) => {
    console.log('✅ MySQL terhubung:', `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    conn.release(); // Kembalikan koneksi ke pool setelah dicek
  })
  .catch((err) => {
    console.error('❌ Gagal terhubung ke MySQL:', err.message);
    console.error('   Pastikan MySQL berjalan dan konfigurasi .env sudah benar.');
    // Tidak process.exit() agar app tetap bisa jalan meski DB belum siap
  });

module.exports = pool;
