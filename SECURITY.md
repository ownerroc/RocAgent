# Security Policy

RocSystem Core (RocSystem) adalah perangkat lunak proprietary milik Ivan Ssl.
Repositori ini **private**; meski demikian, kebijakan ini berlaku untuk
pelaporan kerentanan internal maupun (jika repo kelak dipublikasikan) publik.

## Supported Versions

Hanya versi terbaru yang menerima perbaikan keamanan. Versi lama tidak lagi
didukung.

| Version | Supported          |
| ------- | ------------------ |
| 5.22.x  | :white_check_mark: |
| < 5.22  | :x:                |

## Reporting a Vulnerability

**Jangan** membuka issue publik (jika tersedia) untuk kerentanan keamanan.

Laporkan secara privat ke:

- **Email**: `ivansuselo@gmail.com`

Sertakan dalam laporan:

1. Versi RocSystem yang terdampak.
2. Langkah reproduksi yang jelas dan ringkas.
3. Dampak potensial (jenis kebocoran/risiko).
4. Bukti pendukung (log, potongan kode, dst.) jika ada.

### Yang bisa Anda harapkan

- **Konfirmasi diterima**: dalam 3 hari kerja.
- **Status update**: minimal tiap 14 hari sampai masalah ditutup.
- **Penanganan**: kerentanan yang valid akan diperbaiki pada rilis versi
  terdekat; kredensial yang terekspos akan dirotasi segera.

### Scope

- Kerentanan pada kode `server/`, `src/`, dan tool yang dieksekusi oleh agent.
- Kebocoran kredensial (API key, PAT, token) yang tersimpan atau ter-log.
- Celah yang memungkinkan eksekusi perintah di luar batasan shell guard / SSRF guard.

### Out of scope

- Masalah pada dependensi pihak ketiga yang sudah dilaporkan ke upstream-nya.
- Laporan tanpa langkah reproduksi.
- Kerentanan teoretis tanpa dampak praktis yang dapat diverifikasi.

## Catatan

Semua kredensial wajib dirotasi setelah terindikasi bocor. Lihat `.env.example`
untuk daftar variabel yang harus dijaga, dan jangan pernah commit `.env`,
`db.json`, vault, atau berkas kunci apa pun.
