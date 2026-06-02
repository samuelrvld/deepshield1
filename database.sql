-- ============================================================
-- DeepShield Database Setup Script
-- Jalankan file ini di: MySQL Workbench / phpMyAdmin / terminal
-- ============================================================

-- 1. Buat & pilih database
CREATE DATABASE IF NOT EXISTS deepshield_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE deepshield_db;

-- ============================================================
-- 2. Tabel USERS — untuk autentikasi login
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id         INT          NOT NULL AUTO_INCREMENT,
  username   VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email    (email),
  UNIQUE KEY uq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Tabel SCAN_RESULTS — menyimpan hasil deteksi deepfake
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_results (
  id                INT           NOT NULL AUTO_INCREMENT,
  user_id           INT           NULL,
  original_filename VARCHAR(255)  NULL,
  result_class      VARCHAR(50)   NOT NULL,
  confidence        FLOAT         NOT NULL,
  is_fallback       TINYINT(1)    NOT NULL DEFAULT 0,
  ai_raw_response   JSON          NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_id    (user_id),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_scan_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. User demo (password: Admin123!)
-- Hash bcrypt dari 'Admin123!' dengan salt 12
-- ============================================================
INSERT IGNORE INTO users (username, email, password, role) VALUES
  ('admin',    'admin@deepshield.id',  '$2a$12$eImiTXuWVxfM37uY4JANjQ==PLACEHOLDER', 'admin'),
  ('testuser', 'test@deepshield.id',   '$2a$12$eImiTXuWVxfM37uY4JANjQ==PLACEHOLDER', 'user');

-- CATATAN: Jangan pakai INSERT di atas untuk user demo.
-- Gunakan perintah: npm run db:init
-- Script itu otomatis generate hash bcrypt yang benar.

-- ============================================================
-- Verifikasi — jalankan ini untuk cek tabel berhasil dibuat
-- ============================================================
SHOW TABLES;
DESCRIBE users;
DESCRIBE scan_results;
