DeepShield Backend API
Dokumentasi ini memberikan panduan teknis mengenai struktur backend aplikasi DeepShield. Dokumentasi ini disusun untuk mempermudah proses integrasi antara backend dengan frontend.

🛠 Tech Stack
Language: Node.js

Framework: Express.js

Database: MySQL (via mysql2/promise)

Authentication: JSON Web Token (JWT)

AI Integration: Axios (untuk komunikasi dengan model FastAPI)


🔑 Konfigurasi Environment
Pastikan file .env telah dikonfigurasi pada root directory proyek dengan parameter berikut:
Cuplikan kode
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=deepshield_db
JWT_SECRET=ganti_dengan_secret_key_yang_aman
AI_SERVER_URL=http://localhost:8000

Peringatan: Jangan pernah mengunggah file .env ke repositori publik (GitHub).
📡 API EndpointsBerikut adalah daftar endpoint yang tersedia untuk dikonsumsi oleh 
Method,Endpoint,Deskripsi,Headers
POST,/api/auth/login,Autentikasi User,-
POST,/api/scan,Upload & Deteksi Gambar,Authorization: Bearer <token>
GET,/api/report/:id,Mengambil detail hasil scan,Authorization: Bearer <token>

🚀 Cara Menjalankan
Untuk menjalankan lingkungan pengembangan (development), ikuti langkah berikut:

Install Dependencies:

Bash
npm install
Database Setup:
Pastikan database MySQL dengan nama deepshield_db telah dibuat sebelum menjalankan server.

Start Server:

Bash
npm run dev
