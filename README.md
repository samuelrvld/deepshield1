DeepShield Backend - DocumentationHalo Mona! Dokumentasi ini dibuat untuk mempermudah integrasi antara backend dan frontend aplikasi DeepShield.🛠 Tech StackLanguage: Node.jsFramework: Express.jsDatabase: MySQL (via mysql2/promise)Authentication: JSON Web Token (JWT)AI Integration: Axios (untuk komunikasi ke model FastAPI)🔑 Konfigurasi Environment (.env)Pastikan kamu sudah memiliki file .env di root folder dengan format berikut:Cuplikan kodePORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=deepshield_db
JWT_SECRET=ganti_dengan_secret_key_mu
AI_SERVER_URL=http://localhost:8000
(Catatan: Jangan push file .env ini ke GitHub!)📡 API Endpoints (Untuk Frontend)Berikut adalah endpoint yang sudah siap digunakan:MethodEndpointDeskripsiHeadersPOST/api/auth/loginLogin user-POST/api/scanUpload & deteksi gambarAuthorization: Bearer <token>, Content-Type: multipart/form-dataGET/api/report/:idAmbil detail hasil scanAuthorization: Bearer <token>Catatan untuk Frontend:Auth: Untuk endpoint yang memerlukan proteksi, sertakan token JWT di header Authorization dengan format Bearer <token>.Scan: Saat memanggil /api/scan, pastikan frontend menggunakan FormData untuk mengirim file gambar.Response: Semua response API konsisten menggunakan format JSON:JSON{
  "success": true,
  "data": { ... }
}

## 🚀 Cara Menjalankan
1. Install dependencies: `npm install`
2. Jalankan server: `npm run dev` (pastikan `nodemon` terinstall)
3. Pastikan database `deepshield_db` sudah dibuat di MySQL.
