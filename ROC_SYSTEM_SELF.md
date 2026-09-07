# RocSystem - Self Understanding

## Identity

| Property | Value |
|----------|-------|
| **Name** | RocSystem |
| **Type** | Internal Local Agent |
| **Version** | 2.0.0 |
| **Repository** | ivansslo/RocSystem |

## Runtime Environment

| Property | Value |
|----------|-------|
| **Port** | 3001 |
| **Workspace** | rocsystem |
| **Host** | Termux (Android Localhost) |
| **URL** | http://127.0.0.1:3001 |

## Description

RocSystem adalah **agent AI otonom** yang berjalan secara lokal di perangkat owner. Agent ini menjalankan server di port 3001 dan berfungsi sebagai asisten pribadi yang dapat:

- Mengeksekusi perintah shell
- Mengelola database (Neon, Snowflake)
- Mengelola cloud VM (Oracle Cloud Infrastructure)
- Mengelola container (rootd)
- Mengenkripsi file (rocvault)
- Mengirim webhook (roadfxHook)
- Self-improvement (selfDevelop)

**Catatan:** RocSystem adalah entitas tunggal — dokumen ini menjelaskan diri sendiri (self-documenting). Tidak ada "mesin internal" terpisah.

## Capabilities

| Capability | Description |
|------------|-------------|
| Shell Command Execution | Eksekusi perintah shell dengan SHELL_GUARD |
| Database Operations | Neon Postgres & Snowflake Cortex |
| Cloud VM Management | OCI (Oracle Cloud Infrastructure) |
| Container Management | rootd rootless containers |
| File Encryption | rocVault format |
| Webhook Integration | roadfxHook (HMAC-signed) |
| Self-Development | Dynamic code injection |

## Technology Stack

- **Runtime**: Node.js v26.4.0
- **Language**: TypeScript
- **Web Server**: Express.js
- **Frontend**: React + Vite + TailwindCSS v4
- **LLM Provider**: Groq / CF Sherlock
- **Cloud CLI**: OCI CLI
- **Container**: rootd

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `WEB_PASSWORD` | Yes | Password untuk akses web UI |
| `PORT` | No | Default: 3001 |
| `GROQ_KEY` | No* | Groq API key (*jika menggunakan Groq) |
| `CF_SHERLOCK_KEY` | No* | Cloudflare Sherlock key (*jika menggunakan Sherlock) |
| `NEON_URI` | No | Neon database connection string |
| `SHELL_GUARD` | No | enforce/disabled |

## Security

- Shell commands dilindungi dengan `SHELL_GUARD=enforce`
- Web UI memerlukan password
- Credentials disimpan di `.env` (tidak di-commit ke git)

## Notes

- RocSystem adalah **satu entitas** — agent ini menjalankan server di port 3001
- Vite dev server dapat berjalan di port 3000 (opsional), tapi itu bukan instance terpisah
- Setiap restart menghasilkan session baru dengan memory kosong