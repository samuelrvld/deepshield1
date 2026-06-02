// src/config/initDb.js
// Jalankan sekali dengan: npm run db:init
// Script ini membuat database + tabel secara otomatis jika belum ada.

require('dotenv').config();
const mysql = require('mysql2/promise');

async function initDatabase() {
  // Koneksi TANPA pilih database dulu (untuk bisa CREATE DATABASE)
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  const dbName = process.env.DB_NAME || 'deepshield_db';

  try {
    console.log('🚀 Menginisialisasi database DeepShield...\n');

    // 1. Buat database jika belum ada
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await conn.query(`USE \`${dbName}\``);
    console.log(`✅ Database '${dbName}' siap.`);

    // 2. Tabel users — untuk autentikasi login
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT          NOT NULL AUTO_INCREMENT,
        username   VARCHAR(100) NOT NULL UNIQUE,
        email      VARCHAR(150) NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,          -- bcrypt hash
        role       ENUM('user','admin') NOT NULL DEFAULT 'user',
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_email (email),
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabel users siap.');

    // 3. Tabel scan_results — menyimpan hasil deteksi deepfake
    await conn.query(`
      CREATE TABLE IF NOT EXISTS scan_results (
        id           INT           NOT NULL AUTO_INCREMENT,
        user_id      INT           NULL,                      -- NULL jika user belum login
        original_filename VARCHAR(255) NULL,                  -- Nama file asli dari user
        result_class VARCHAR(50)   NOT NULL,                  -- 'Real' atau 'Fake'
        confidence   FLOAT         NOT NULL,                  -- Nilai 0.00 - 1.00
        is_fallback  TINYINT(1)    NOT NULL DEFAULT 0,        -- 1 jika data simulasi (AI server mati)
        ai_raw_response JSON       NULL,                      -- Simpan respons mentah dari FastAPI
        created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at),
        CONSTRAINT fk_scan_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Tabel scan_results siap.');

    // 4. Insert user demo (password: Admin123!)
    const bcrypt = require('bcryptjs');
    const demoPassword = await bcrypt.hash('Admin123!', 12);
    await conn.query(`
      INSERT IGNORE INTO users (username, email, password, role)
      VALUES
        ('admin',    'admin@deepshield.id',   '${demoPassword}', 'admin'),
        ('testuser', 'test@deepshield.id',    '${demoPassword}', 'user')
    `);
    console.log('✅ User demo dibuat (jika belum ada).');

    console.log('\n🎉 Inisialisasi selesai! Jalankan: npm run dev');
  } catch (err) {
    console.error('❌ Error saat inisialisasi:', err.message);
    throw err;
  } finally {
    await conn.end();
  }
}

initDatabase().catch(() => process.exit(1));
