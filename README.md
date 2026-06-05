🛡️ DeepShield Backend
Sistem deteksi deepfake berbasis AI — Capstone Project Coding Camp 2026 powered by DBS Foundation.

📋 Deskripsi Singkat Proyek
DeepShield adalah aplikasi web yang mampu mendeteksi apakah sebuah gambar merupakan deepfake atau asli menggunakan model Machine Learning. Backend ini dibangun dengan Node.js/Express dan berkomunikasi dengan AI server berbasis FastAPI (Python/TensorFlow).

⚙️ Petunjuk Setup Environment
Prasyarat

Node.js v18+
MySQL 8.0+ (XAMPP / Laragon / MySQL Workbench)
AI Server FastAPI berjalan di port 8000

1. Clone repository
bashgit clone https://github.com/samuelrvld/deepshield1.git
cd deepshield1
2. Install dependencies
bashnpm install
3. Setup environment variables
bashcp .env.example .env

Edit file .env sesuai konfigurasi lokal kamu:
envPORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=isi_password_mysql_kamu
DB_NAME=deepshield_db
JWT_SECRET=isi_dengan_string_panjang_dan_acak
JWT_EXPIRES_IN=24h
AI_SERVER_URL=http://localhost:8000
ALLOWED_ORIGINS=http://localhost:5173

4. Inisialisasi database
bashnpm run db:init

Script ini otomatis membuat:
Database deepshield_db
Tabel users dan scan_results
User demo: admin@deepshield.id / Admin123!
5. Jalankan server
bashnpm run dev    # Development (auto-reload)
npm start      # Production
Server berjalan di: http://localhost:3000

🛠️ Tech Stack

Runtime: Node.js v18+
Framework: Express.js
Database: MySQL + mysql2/promise
Auth: JWT (jsonwebtoken) + bcryptjs
File Upload: Multer (memory storage)
HTTP Client: Axios + form-data
AI Integration: FastAPI (Python) di port 8000
