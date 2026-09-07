# rocxmo

**Type**: Internal Local Agent  
**Version**: 2.0.0  
**Port**: 3001  
**Workspace**: rocxmo

---

## Apa itu RocSystem?

RocSystem adalah **agent AI otonom** yang berjalan di environment Termux Android (localhost). Agent ini berfungsi sebagai asisten pribadi yang dapat mengeksekusi perintah shell, mengelola database, cloud VM, container, dan berbagai tugas otomatisasi lainnya.

---

## Kebutuhan Sistem

| Komponen | Minimum |
|----------|---------|
| Node.js | v20+ (rekomendasi v26+) |
| npm | v10+ |
| OS | Termux (Android) / Linux |
| Akses | SSH (opsional) |

---

## Cara Install & Run

```bash
# Clone repository
git clone https://github.com/ownerroc/rocxmo.git
cd rocxmo

# Install dependencies
npm install

# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

---

## Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🤖 **AI Agent** | Agent AI otonom dengan LLM (Groq/CF Sherlock) |
| 💻 **Shell Execution** | Eksekusi perintah shell dengan security |
| 🗄️ **Database** | Neon Postgres & Snowflake Cortex |
| ☁️ **Cloud VM** | Oracle Cloud Infrastructure (OCI) management |
| 📦 **Container** | rootd rootless container runtime |
| 🔐 **Encryption** | rocVault file encryption |
| 🔗 **Webhook** | roadfxHook integration |
| 🛠️ **Self-Develop** | Dynamic self-improvement capability |

---

## Konfigurasi

Salin `.env.example` ke `.env` dan isi variabel yang diperlukan:

```bash
cp .env.example .env
```

Variabel penting:
- `WEB_PASSWORD` — Password untuk akses web UI
- `GROQ_KEY` — Groq API key (untuk LLM)
- `NEON_URI` — Neon database connection string

---

## Akses

| Akses | URL |
|-------|-----|
| Web UI | http://127.0.0.1:3001 |
| API | http://127.0.0.1:3001/api |

---

## Keamanan

- Shell commands dilindungi dengan `SHELL_GUARD`
- Web UI memerlukan password
- Credential disimpan di `.env` (tidak di-commit)

---

## Lisensi

MIT License - lihat NOTICE.md untuk detail.