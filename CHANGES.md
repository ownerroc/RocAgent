# RocSystem — Changelog (RocSystem Core)

> Snapshot hasil refactor. Berisi proyek inti lengkap (sudah termasuk semua perubahan).
> Tidak menyertakan: `node_modules/`, `dist/`, `.git/`, `db.json`, `sessions/`, `.env`.

## 2026-09-04 — SSH Orchestrator v1.0.0

Multi-device SSH execution tool untuk RocSystem.

- **`tools/ssh-orchestrator/`**: Tool baru untuk orchestrate banyak server via SSH
  - `exec <cmd>`: Eksekusi command di remote host
  - `list`: List configured hosts
  - `test`: Test SSH connectivity
- Konfigurasi via `.env` (SSH_HOST, SSH_USER, SSH_PORT, SSH_PASSWORD)
- Support password-based auth via sshpass
- Tested & working di Termux localhost:8022

## 2026-08-19 — rocvault: penulisan vault atomis (fix kehilangan data saat disk penuh)

Laporan lapangan: `rocvault edit` pada vault di `/sdcard` yang penuh gagal dengan
`cat: write error: No space left on device` dan MENINGGALKAN vault 0 byte.
Semua percobaan berikutnya gagal dengan `Bukan berkas rocvault (header: )`
walau passphrase benar — memang tidak ada lagi isi yang bisa didekripsi.

Akar masalah: `{ cat "$body"; printf ...; } > "$enc"` di `edit`/`rotate`/`lock`.
Shell membuka `$enc` dengan O_TRUNC SEBELUM `cat` berjalan, sehingga kegagalan
tulis apa pun menghancurkan vault lama.

- **`tools/rocvault`**: helper baru `write_vault_atomic` — berkas baru ditulis
  lengkap ke nama sementara di direktori yang sama (rename atomis via `mv`),
  cadangan `$enc.bak` dibuat sebelum mengganti, cek ruang kosong `df` sedini
  mungkin dengan pesan yang jelas, `chmod`/`sync` non-fatal demi `/sdcard`.
  Dipakai oleh `lock`, `edit`, dan `rotate`.
- **`edit`**: verifikasi baca-ulang setelah simpan; menolak argumen ekstra
  (`rocvault edit x.vault -- npm start`) dengan petunjuk ke `run` — dulu
  argumen itu diam-diam diabaikan.
- **`vault_open`**: pesan khusus untuk vault 0 byte (ditegaskan BUKAN
  passphrase salah + langkah pemulihan dari `.bak`); header kosong ditampilkan
  sebagai `<kosong>`, bukan string kosong yang membingungkan.
- **`rotate`**: plaintext sementara pindah ke tmpfs (selaras dengan `edit`).
- **`tools/__tests__/rocvault.test.sh`** (25 uji, semua lulus): regresi
  "disk penuh saat edit/lock" (vault lama harus utuh, tak ada vault parsial),
  isi `.bak` hasil edit/rotate, pesan untuk vault 0 byte, penolakan
  `edit -- perintah`.

Cara memulihkan korban bug lama: `cp <vault>.bak <vault>` bila ada cadangan;
bila tidak, susun ulang `.env` dari sumbernya — ciphertext di berkas 0 byte
memang sudah tidak ada.

## 2026-08-19 — Ganti Gemma / intfloat dengan model chat yang bekerja; perbaiki `npm test`

Gemma (`google/gemma-4-31B-it`, `google/gemma-7b`) dan embedding
`intfloat/e5-mistral-7b-instruct` (plus `BAAI/bge-multilingual-gemma2`)
bukan model chat yang dipakai RocSystem. Sesi lama yang masih menyimpan id
itu akan 404 di Sherlock.

- **`server.ts` `/api/models`**: katalog aktif jadi 4 model chat terverifikasi
  — GPT-OSS 120B, Mistral Small 4, **Llama 3.3 70B** (pengganti Gemma,
  tool-calling sudah diverifikasi live), MiniMax M2.5.
- **`server/orchestrator.ts`**: `cfModelMap` mengarahkan id Gemma → Llama 3.3
  dan id intfloat/e5 / bge-gemma2 → Mistral Small 4. Llama ditambah ke
  rantai failover Sherlock.
- **Docs** (`docs/cloudferro.md`, `cloudferro-knowledge-base.md`,
  `docs/app.env.template`, `.env.example`): Gemma/intfloat dicatat sebagai
  tidak dipakai; rekomendasi "paling ngebut" diganti Llama 3.3.
- **`npm test`**: `tools/rocvault` shebang Termux
  (`#!/data/data/com.termux/files/usr/bin/bash`) membuat suite gagal di
  Linux (`cannot execute: required file not found`) — round-trip + `run`
  rusak karena vault tidak pernah dibuat. Shebang diganti
  `#!/usr/bin/env bash` (konvensi tool lain); tes memanggil lewat `bash`
  supaya tidak tergantung shebang.

## 2026-08-19 — Sensor syntax error di notifikasi + susun ulang model embeddings

Atas permintaan owner ("Analisa repo"):

- **Models — katalog embedding Sherlock disusun rapi** (`docs/cloudferro.md` +
  `cloudferro-knowledge-base.md`): `BAAI/bge-multilingual-gemma2` diletakkan
  paling atas sebagai model utama (multibahasa, berbasis Gemma2, embedding
  OpenAI-compatible), menggantikan `intfloat/e5-mistral-7b-instruct` yang
  dihapus; ditambah satu model baru `BAAI/bge-m3` sebagai cadangan
  multibahasa; lalu `dunzhang/stella_en_1.5B_v5` dan
  `sdadas/stella-pl-retrieval-8k` — total embedding tetap 4 (katalog total
  tetap 14).
- **`server/scriptSyntax.ts` (baru)** — sensor syntax error untuk script/file
  TANPA mengeksekusi kode: TS/TSX/JS/JSX/MJS/CJS lewat TypeScript compiler API
  (`parseDiagnostics`) + fallback `node --check`, JSON via `JSON.parse`,
  Python via `python3 -m py_compile`, Bash via `bash -n`. Hasil disimpan di
  store in-memory per file (dedupe, cap 100 entri).
- **`server/tools.ts`** — `writeFile` dan `editFile` menjalankan sensor setelah
  menulis file skrip; hasil `syntaxErrors` ikut dikembalikan ke agent dalam
  respons tool (pesan sukses diberi tanda ⚠️ bila ada error).
- **`server.ts`** — logika git-updates diekstrak jadi `fetchGithubUpdatesPayload()`
  (dipakai bersama `/api/github/updates` lama); endpoint baru
  `GET /api/notifications` (gabungan `scriptErrors` + `github`) dan
  `POST /api/notifications/script-errors/clear` (hapus semua / per file).
- **UI** — fungsi notification lama `fetchGithubUpdates` diganti
  `fetchNotifications` (`src/App.tsx`, polling 15 detik); `NotificationDropdown`
  kini punya seksi "Script / File Errors" (file, baris:kolom, pesan, tombol
  Bersihkan) selain seksi Git; badge lonceng merah + counter bila ada error
  script/file.
- **Test** — `server/__tests__/scriptSyntax.test.ts` (valid → bersih,
  rusak → terdeteksi dengan baris berguna, store dedupe/clear; cek Python/Bash
  dilewati bila interpreter tidak ada) masuk script `npm test`.

## 2026-08-16 — Hapus total sisa Gemini & Google; bersihkan file junk yang ter-tracking

Atas permintaan owner (anti-pelacakan Google), seluruh sisa Gemini/Google dibersihkan
dari kode, dependensi, dan dokumentasi:

- **Dependensi**: hapus `@google/genai` dari `package.json` + `package-lock.json`
  (SDK Google tidak lagi di-import kode, sebelumnya ikut ter-install tiap `npm install`).
- **Server**: hapus panggilan validator ke `generativelanguage.googleapis.com`;
  alias `xgoog/google/googleai/gemini` diarahkan ke `cfsherlock`; filter key Gemini
  (`GEMINI_API_KEY`, `GEMINI_KEY`, `GOOGLE_API_KEY`, `X_GOOG_API_KEY`) dari `/api/env/config`.
- **Test & metadata**: `tools/test-agent.sh` tidak lagi mengetes Gemini; capability
  `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` dihapus dari `metadata.json`.
- **Docs/template**: README, `docs/ENV_KEYS_LIST.md`, `docs/app.env.template`,
  `cloudferro-knowledge-base.md`, `docs/cloudferro.md`, `scripts/install.sh`
  tidak lagi menyebut Gemini.
- **Junk tracking**: `git rm --cached` untuk `db.json` (+`*.bak`/`*.current`),
  `.RocSystem_guard.*`, `.git_guard.log`, `RocSystem-opt.zip`, backup zip, `backup/`,
  `dist/`, snapshot `lsmod_backup_*`, `.bak`; hapus artefak sistem terpisah
  `patch-roc-agentsroute.sh`, `agent_install.sh`, `nous_agent.sh`.

Guard anti-pelacakan tetap dipertahankan: nama provider `gemini` apa pun dipaksa
ke `cfsherlock`, dan system prompt menegaskan agent tidak punya kemampuan vision.

## 2026-08-01 — Tool baru: query_neon_db (eksekusi SQL nyata ke Neon Postgres)

Diminta owner setelah "Test api dan url" Neon dikonfirmasi berfungsi
(`NEON_API_KEY` → Neon Management API 200 OK, project `ROCAgents` terdeteksi;
`NEON_URI` → koneksi Postgres 18.4 sukses ke database `neondb`).

**`server/tools.ts`**: `query_neon_db` — menjalankan SQL apa pun terhadap
Neon Postgres lewat `pg.Client` (koneksi baru per panggilan, selalu ditutup
di `finally`, bukan pool persisten). Statement yang mengubah data/skema
(`DROP`, `TRUNCATE`, `ALTER`, `DELETE`, `UPDATE`, `CREATE`, `INSERT`,
`GRANT`, `REVOKE`) WAJIB `confirm:true` — mengikuti pola `oci_vm`
terminate / `rootd_fs` rm+purge yang sudah ada. Deteksi destruktif dicek
per-statement (string dipisah `;`) supaya statement destruktif yang
"disembunyikan" setelah statement aman di awal tetap tertangkap. Hasil
dibatasi 200 baris sebelum dikirim ke model, supaya `SELECT *` ke tabel
besar tidak membanjiri context window.

**`server/db.ts`**: skema tool `query_neon_db` didaftarkan, dengan
instruksi eksplisit ke model untuk tidak mengasumsikan owner ingin
mengubah data tanpa `confirm:true`, dan melaporkan hasil tool apa adanya
(tidak mengarang baris/skema).

**`package.json`**: `pg` + `@types/pg` ditambahkan sebagai dependency.

**`docs/cloud.env.template`**: `NEON_URI`/`NEON_API_KEY` (sudah ada
sebagai rujukan sebelumnya) diberi catatan bahwa `NEON_URI` sekarang
benar-benar dipakai `query_neon_db`.

**`server/__tests__/neonDb.test.ts`** (baru, 16 kasus): validasi
parameter, tolak statement destruktif tanpa `confirm` untuk kesembilan
jenis keyword, deteksi statement destruktif tersembunyi di posisi kedua
dalam string multi-statement, statement read-only tidak salah terdeteksi
destruktif, `confirm:true` benar-benar melewati gate destruktif menuju
langkah koneksi. Tidak menjalankan query nyata (NEON_URI sengaja tidak
di-set) — konsisten dengan `ociVmRootdFs.test.ts`.

**Bug ditemukan & diperbaiki selama pengembangan**: urutan pengecekan
semula salah — cek `NEON_URI` dilakukan SEBELUM cek destruktif, sehingga
statement destruktif tanpa `confirm` di lingkungan tanpa `NEON_URI`
malah dilaporkan "Neon belum dikonfigurasi", bukan "butuh confirm:true"
— pesan yang menyesatkan (masalah sebenarnya adalah permintaan
konfirmasi, bukan konfigurasi). Ditemukan lewat test yang gagal
(10 dari 16 kasus awal), diperbaiki dengan menukar urutan kedua
pengecekan, konsisten dengan alasan bahwa kebutuhan `confirm:true`
adalah properti dari SQL itu sendiri, bukan tergantung status konfigurasi.

**Diverifikasi live** terhadap database Neon asli owner (bukan mock):
`SELECT` sederhana (versi/database/user), list tabel (cocok dengan hasil
tes konektivitas awal — skema `neon_auth` berisi 9 tabel), `CREATE TABLE`
tanpa `confirm` ditolak, `CREATE TABLE` dengan `confirm:true` berhasil
membuat tabel nyata, diverifikasi ulang tabel benar-benar ada, lalu
`DROP TABLE` dengan `confirm:true` menghapusnya, diverifikasi ulang
tabel benar-benar hilang — database dikembalikan bersih tanpa sisa data uji.

Verifikasi:
- `npx tsc --noEmit` → 0 error.
- `npx vite build` → sukses.
- `npm test` → 7 suite, 150 kasus (69+9+17+14+14+16+11), 0 gagal, tanpa
  regresi pada 134 kasus lama.

## 2026-08-01 — Fix: model mengulang tool identik berkali-kali tanpa progres (dedup + circuit breaker)

Ditemukan owner lewat log nyata: model (dikonfirmasi live pada CloudFerro
Sherlock MiniMaxAI/MiniMax-M2.5, kemungkinan model non-reasoning lain juga
rentan) memanggil `query_snowflake_insight` dengan pertanyaan **PERSIS
sama** sebanyak 12x berturut-turut dalam satu giliran — padahal hasil
panggilan pertama sudah ada di riwayat pesan yang benar-benar terkirim
balik ke API (transport riwayat diverifikasi benar; ini murni model tidak
"membaca" riwayatnya sendiri dengan cermat). Dampaknya serius, bukan cuma
lambat: `query_snowflake_insight` adalah REQUEST NYATA ke Snowflake Cortex
Agent tiap kali dipanggil — 12x panggilan identik berarti 12x biaya/kuota
Snowflake sungguhan terbuang untuk satu pertanyaan yang sama.

**`server/orchestrator.ts`**, dua lapis perbaikan:

1. **Deduplikasi** (`executeToolDeduped`, `buildToolCallKey`) — setiap
   giliran orchestrator melacak tool+argumen (dinormalisasi urutan key)
   yang SUDAH benar-benar dieksekusi. Panggilan berikutnya dengan
   tool+argumen identik TIDAK dieksekusi ulang (hemat biaya API nyata) —
   hasil sebelumnya dipakai lagi, disertai `_duplicate_call_notice`
   eksplisit di JSON hasil yang dikirim ke model, memberi tahu bahwa ini
   pengambilan ulang bukan eksekusi baru.
2. **Circuit breaker** (`DUPLICATE_CALL_STRIKE_LIMIT = 2`,
   `duplicateToolLoopMessage`) — diverifikasi live: model kadang tetap
   "ngotot" mencoba tool identik lagi walau sudah diberi tahu itu
   duplikat. Setelah 2 duplikat terdeteksi dalam satu giliran, loop
   dihentikan PAKSA (tidak menunggu sampai `MAX_TOOL_TURNS`), dan jawaban
   akhir dibangun dari hasil tool yang sudah didapat (`answer`/`message`
   dari log eksekusi terakhir), bukan pesan generik "kehabisan giliran".

Diterapkan konsisten di keenam fungsi provider yang memanggil tool
(`callGroq`, `callOpenAI`, `callOpenRouter`, `callGemini`, `callRoadQwen`,
`callCloudFerro`) — pola loop-nya berbeda-beda di tiap fungsi (indeks
`data.choices` vs `contents`/`calls` khusus Gemini, loop multi-endpoint
RoadQwen), jadi setiap titik keluar loop ditangani sesuai strukturnya
masing-masing.

Diverifikasi live lewat `runOrchestrator()` asli (bukan mock), diulang
5x untuk menangkap variasi perilaku model yang tidak selalu deterministik:
- Beberapa percobaan: dedup bekerja, mengurangi jumlah eksekusi tool
  nyata dari yang diminta model (mis. 3 permintaan tool_start,
  hanya panggilan pertama yang benar-benar dieksekusi — sisanya
  di-suppress dengan log `"Duplicate tool call suppressed ... strike
  N/2"` yang terlihat di output).
- Satu percobaan direproduksi persis seperti laporan owner: 2 strike
  duplikat terdeteksi, loop diputus paksa hanya setelah 3 tool_start
  (bukan 12), hasil akhir `"⚠️ Saya mendeteksi diri saya memanggil tool
  yang SAMA PERSIS berulang kali tanpa progres, jadi saya hentikan paksa
  ..."` — tepat seperti yang dirancang.
- Beberapa percobaan lain: model memvariasikan sedikit kata di
  pertanyaan/query tiap panggilan (bukan identik persis), sehingga dedup
  tidak berlaku tapi tetap mentok `MAX_TOOL_TURNS` — tertangani oleh fix
  sesi sebelumnya (`toolBudgetExhaustedMessage`, dilaporkan jujur, bukan
  "provider gagal").

Verifikasi:
- `npx tsc --noEmit` → 0 error.
- `npx vite build` → sukses.
- `npm test` → 6 suite, 134 kasus, 0 gagal, tanpa regresi.

## 2026-08-01 — Fix: kehabisan giliran tool disamarkan jadi "provider gagal total" (6 provider)

Ditemukan saat owner meminta benchmark objektif CloudFerro Sherlock vs
provider lain. Skenario uji: minta agent men-terminate VM OCI tanpa
`compartmentId` dikonfigurasi. Alih-alih melaporkan info yang kurang,
agent menghabiskan seluruh 12 giliran tool (`MAX_TOOL_TURNS`) mencoba
menemukan `compartmentId` sendiri (cek env, baca config, grep kode,
coba `oci` CLI langsung) — perilaku ini SENGAJA dan AMAN (`terminate`
tidak pernah dipanggil tanpa info cukup, sesuai desain `confirm:true`
di `oci_vm`), tapi begitu loop keluar karena mentok (bukan karena
selesai), `content` respons API kosong, dan SEMUA fungsi provider
(`callGroq`, `callOpenAI`, `callOpenRouter`, `callGemini`, `callRoadQwen`,
`callCloudFerro`) salah menyimpulkan ini sebagai
`"Provider returned empty response content"` — pesan yang identik
dengan kegagalan API sungguhan, memicu failover ke provider berikutnya
dan berpotensi menyesatkan pesan diagnostik akhir menuduh API
key/kuota, padahal agent sebenarnya masih bekerja saat kehabisan
giliran.

**`server/orchestrator.ts`**: fungsi baru `toolBudgetExhaustedMessage()`
membangun pesan jujur berisi daftar tool yang sudah dicoba, dipakai di
titik keluar loop pada keenam fungsi provider di atas — dibedakan
lewat pengecekan apakah `tool_calls` masih ada saat loop berhenti
(mentok giliran) vs benar-benar tidak ada (selesai normal/API kosong
sungguhan). Hasil "kehabisan giliran" dikembalikan sebagai jawaban
biasa (bukan `throw`), sehingga TIDAK memicu failover ke provider
lain — laporan jujur adalah jawaban valid, bukan kegagalan.
`callCloudflare`/`callOciModel` tidak disentuh (keduanya tidak
memanggil tool sama sekali, jadi tidak rentan bug ini).

Diverifikasi live: skenario "terminate VM tanpa compartmentId" diulang
setelah fix — hasil sekarang `"⚠️ Saya kehabisan jatah percobaan tool
(12x) sebelum menyelesaikan permintaan ini — ini BUKAN kegagalan
provider/API key/kuota"` beserta daftar 12 tool yang dicoba, alih-alih
pesan lama yang menyesatkan.

Verifikasi:
- `npx tsc --noEmit` → 0 error.
- `npx vite build` → sukses.
- `npm test` → 6 suite, 134 kasus, 0 gagal, tanpa regresi.

## 2026-08-01 — Provider baru: CloudFerro Sherlock

Diprakarsai investigasi log kegagalan orchestrator owner: dalam satu malam
Cloudflare AI (kuota harian habis), Gemini (kuota 429), Groq (`gpt-oss-120b`
mengalami bug intermiten yang sudah dikenal komunitas — kadang balasan
kosong setelah tool call), OpenRouter (`User not found`, indikasi kunci
bermasalah), dan OpenAI (kredit habis) gagal berurutan pada request yang
sama, sehingga percakapan jatuh ke fallback jujur "tidak ada provider yang
merespons". Investigasi mendalam (bukan asumsi) menunjukkan seluruh
kegagalan itu nyata di sisi masing-masing akun/provider, bukan bug logika
orchestrator — tapi menambah provider independen baru tetap mengurangi
peluang seluruh rantai gagal bersamaan.

**`server/orchestrator.ts`**: `callCloudFerro()` — provider baru memakai
endpoint OpenAI-compatible CloudFerro Sherlock
(`https://api-sherlock.cloudferro.com/openai/v1`, GPU cloud yang dihosting
di Polandia). Didaftarkan sebagai `cfsherlock` di `DEFAULT_MODEL`
(default `MiniMaxAI/MiniMax-M2.5`), `PROVIDER_ALIAS` (`sherlock`,
`cloudferro`), rantai `providersToTry`, dan guard kredensial
(`CF_SHERLOCK_KEY`/`CLOUDFERRO_SHERLOCK_API_KEY`/`CLOUDFERRO_KEY`).
`callTurboFallback()` (pesan diagnostik akhir) ikut menyebutkan CloudFerro
Sherlock kalau kuncinya terisi.

**`server.ts`**: `/api/models` menambahkan `cfsherlock` ke availability
check dan dua entri katalog (`MiniMaxAI/MiniMax-M2.5`,
`meta-llama/Llama-3.3-70B-Instruct`) supaya muncul di dropdown model UI.

**`docs/app.env.template`, `docs/ENV_KEYS_LIST.md`, `README.md`**:
didokumentasikan `CF_SHERLOCK_KEY` dan alias provider baru.

Diverifikasi live secara menyeluruh sebelum menulis kode integrasi (bukan
menebak format API dari dokumentasi saja):
- `GET /openai/v1/models` dengan kunci asli owner → HTTP 200, daftar 5+
  model chat (`meta-llama/Llama-3.3-70B-Instruct`, `MiniMaxAI/MiniMax-M2.5`,
  `openai/gpt-oss-120b`, `speakleash/Bielik-11B-v3.0-Instruct`, dst).
- `POST /openai/v1/chat/completions` tanpa tool → HTTP 200, balasan normal.
- `POST /openai/v1/chat/completions` DENGAN tool (skema
  `list_project_files` asli) → `finish_reason: "tool_calls"`, format
  identik OpenAI/Groq, untuk `Llama-3.3-70B-Instruct` maupun
  `gpt-oss-120b` (yang terakhir juga mengembalikan field `reasoning`
  terpisah dari `content`, sama seperti versi Groq-nya — tapi `content`
  tetap terisi normal, bukan kosong).
- **End-to-end lewat `runOrchestrator()` asli** (bukan mock): dengan
  `PROVIDER=cfsherlock`, orchestrator memilih provider ini, memanggil tool
  `list_project_files` **sungguhan** (bukan stub) dua kali dalam satu
  giliran tool-loop, membaca daftar file asli repo, dan menghasilkan
  jawaban akhir koheren berdasarkan hasil tool tersebut.

Verifikasi kode:
- `npx tsc --noEmit` → 0 error.
- `npx vite build` → sukses.
- `npm test` → 6 suite, 134 kasus, 0 gagal, tanpa regresi.

## 2026-08-01 — Fix nama bentrok `oci` vs CLI Oracle; hapus referensi endpoint Ollama/Tailscale yang sudah dihapus

**1. `tools/bashrc-helpers.sh` / `tools/install-bashrc-helpers.sh`: `oci()` → `oci_vm()`.**
Owner memakai RocSystem dan `github.com/ivansslo/termuxrd-cloud` di Termux
yang sama. `termuxrd-cloud` menginstal CLI resmi Oracle Cloud sebagai
binary bernama `oci` di PATH. `tools/bashrc-helpers.sh` RocSystem
mendefinisikan fungsi shell `oci()` sendiri (SSH ke VM, uji port dulu,
bukan CLI Oracle) — karena fungsi shell diselesaikan sebelum binary di
PATH, mengetik `oci compute instance list` di shell manapun yang sudah
`source ~/.bashrc` diam-diam memanggil SSH RocSystem, bukan CLI Oracle
asli. Dilaporkan owner: "opsi 2 (Install OCI CLI) setelah jalankan fungsi
oci-cli jadi masuk ke VM".

Fungsi diganti nama jadi `oci_vm()` (implementasi `oci_shell()` di
baliknya tidak berubah). `install-bashrc-helpers.sh` diperbarui: ringkasan
perintah di akhir instalasi menyebut `oci_vm`, dan — karena `.bashrc`
hanya men-`source` file helper (bukan menyalin definisinya), meng-install
ulang otomatis memuat versi baru untuk shell BARU — ditambahkan peringatan
eksplisit saat instalasi terdeteksi sebagai upgrade (marker
`RocSystem helpers` sudah ada sebelumnya): shell interaktif yang SEDANG
berjalan mungkin masih punya `oci()` lama di memori sampai dibuka ulang.

**Diverifikasi live**: dijalankan `install-bashrc-helpers.sh` di `$HOME`
sandbox terisolasi (fresh install lalu upgrade) — dikonfirmasi
`type oci_vm` mengembalikan fungsi yang benar, `type oci` sudah tidak ada
sama sekali, dan pesan peringatan migrasi muncul tepat saat upgrade.

**2. `docs/cloud.env.template`, `tools/bashrc-helpers.sh`: hapus referensi node Tailscale yang sudah dihapus.**
Owner mengonfirmasi node Tailscale `awsx` (sebelumnya bernama `roadfx`,
hostname `awsx.tail759f3e.ts.net`, IP `100.100.237.104`) — yang sesi
sebelumnya (2026-07-31) baru saja dijadikan rujukan `VM_TAILSCALE_HOSTNAME`
dan `OCI_MODEL_ENDPOINT` untuk provider Ollama/OCI di
`server/orchestrator.ts` — **sudah dihapus total** dari
console.tailscale.com, belum ada pengganti. `cloud.env.template`
dikembalikan ke kosong/placeholder untuk `VM_TAILSCALE_HOSTNAME` dan
`OCI_MODEL_ENDPOINT`, dengan catatan eksplisit kenapa (bukan sekadar
dihapus diam-diam — nilai lama itu jangan dipakai lagi kalau owner
menemukannya di riwayat/backup). `AWS_TS_IP`/`AWS_PUBLIC_IP` di
`bashrc-helpers.sh` (dipakai fungsi `awsx()`, node yang sama) diberi
catatan serupa; nilainya sengaja TIDAK dikosongkan supaya `_roc_connect`
tetap menguji port dan gagal dengan pesan jelas ("tidak terjangkau"),
bukan error variabel-kosong yang membingungkan.

Verifikasi:
- `bash -n` pada kedua file shell yang diubah → tidak ada error sintaks.
- `npx tsc --noEmit` → 0 error.
- `npx vite build` → sukses.
- `npm test` → 6 suite, 134 kasus, 0 gagal, tanpa regresi (perubahan ini
  murni file shell, tidak menyentuh kode TypeScript, divalidasi penuh
  tetap sesuai standar proyek).

## 2026-07-31 — Hapus fitur "Synced Apps" fiktif; perbaiki system prompt yang menyebut repo yang sudah dihapus/di-rename

Owner melaporkan agent "masih menyimpan ingatan lama" saat ditanya
kemampuannya — jawabannya masih menyebut interaksi dengan
`ivansslo/roca-codex` dan `ivansslo/rocquantums`, padahal repo pertama sudah
di-rename menjadi `ivansslo/RocSystem` (repo ini sendiri) dan repo kedua
sudah dihapus total (dikonfirmasi `404` via GitHub API). Ini **bukan**
memori/state yang tersimpan — ini teks system prompt hardcode di
`getServerEnvironmentContext()` (`server/orchestrator.ts`) yang disuntikkan
ke SETIAP request LLM, jadi selalu terbaca ulang dan tidak pernah basi
dengan sendirinya.

Owner juga menanyakan apakah `roc-webui.zip`/`roc-otoweb.zip` masih
diperlukan, mengingat source asli (`github.com/ivansslo/roc-webui`,
`github.com/ivansslo/roc-otoweb`) sudah ada dan sudah diimplementasikan
(roc-webui jadi basis desain pipeline "engineering" Agent Multi). Diperiksa:
kedua .zip itu **bukan** clone repo asli — hanya `export_app_archive`
membungkus SATU file `.md` placeholder buatan sendiri (`# Overview\n
Documentation manifest for ...`) menjadi `.zip`, lalu `sync_external_app`
melakukan "sync probe" yang isinya cuma `fetch(url, {method:'HEAD'})` +
`unzip -l` pada zip buatan sendiri itu — tidak pernah benar-benar
mengambil/menganalisis isi repo aslinya. Diputuskan: dihapus, diganti
tautan langsung ke repo aslinya (yang sudah tercantum di berbagai tempat
lain di codebase/dokumentasi).

**Dihapus (`server/db.ts`, `server/tools.ts`, `server.ts`,
`src/components/SyncDashboard.tsx`):**
- Tool `get_synced_apps_status`, `sync_external_app`, `inspect_synced_app`,
  `export_app_archive` — skema di `db.ts` dan implementasi di `tools.ts`.
- Interface `SyncedApp`, field `syncedApps` di `DatabaseSchema`, method
  `Database.getSyncedApps()` / `Database.updateAppStatus()`. Constructor
  `Database` sekarang secara aktif `delete`-kan key `syncedApps` dari
  `db.json` lama pada boot berikutnya, sehingga instalasi yang sudah
  berjalan otomatis bersih tanpa migrasi manual.
- Endpoint `GET /api/synced-apps` dan `POST /api/synced-apps/:id/sync`.
- `SyncDashboard.tsx`: bagian "Workspace Synced Apps" (kartu per-app +
  tombol "Sync" + catatan "diverifikasi langsung pada sistem" yang
  sebenarnya tidak pernah benar-benar terjadi) dihapus total. Kartu AI
  Provider / GitHub / Akun yang murni menampilkan data nyata dari endpoint
  lain (`/api/models`, `/api/github/updates`) dipertahankan apa adanya.

**Diperbaiki (`server/orchestrator.ts`):**
- `OWNER_SYSTEM_PROMPT_BASE`: directive "roc-webui.zip, roc-otoweb.zip"
  diganti "uploaded attachment" (generik, tidak menyebut app spesifik yang
  sudah tidak relevan).
- `getServerEnvironmentContext()`: baris "Primary Source Repositories:
  ivansslo/roca-codex and ivansslo/rocquantums" dan "Ecosystem Synced
  Workspace Apps: roc-webui.zip / roc-otoweb.zip" diganti satu baris
  faktual — **ivansslo/RocSystem** sebagai satu-satunya source repo, dengan
  catatan eksplisit bahwa nama lama sudah pensiun/di-rename (supaya kalau
  owner atau model menyebut nama lama itu lagi di masa depan, konteks ini
  sendiri yang meluruskan, bukan mengulang klaim basi). Baris "Environment
  Awareness" diperbarui menyebut `oci_vm`/`rootd_fs` (tool baru sesi
  sebelumnya) alih-alih `export_app_archive` (yang baru saja dihapus).

**Docs:** `docs/OCI_TAILSCALE_APERTURE_GUIDE.md` dan
`docs/TROUBLESHOOT_IP_CHANGED_100_100_237_104.md` menandai URL
`raw.githubusercontent.com/ivansslo/rocquantums/...` sebagai basi/404
(dikonfirmasi langsung dengan curl) alih-alih menghapusnya diam-diam,
supaya siapa pun yang mengikuti panduan lama tahu persis kenapa perintah
itu akan gagal.

**Diverifikasi:**
- Dicek langsung ke GitHub API: `ivansslo/rocquantums` → 404 (dihapus
  sungguhan); `ivansslo/roca-codex` → 301 redirect ke `ivansslo/RocSystem`
  (di-rename, bukan repo terpisah).
- `getServerEnvironmentContext()` dipanggil secara langsung (live, bukan
  dibaca sebagai teks) setelah perubahan — output dicek tidak lagi memuat
  `roc-webui.zip`, `roc-otoweb.zip`, `export_app_archive`, atau
  `ivansslo/rocquantums`.
- `npx tsc --noEmit` → 0 error.
- `npx vite build` → sukses.
- `npm test` → 6 suite, 134 kasus, 0 gagal, tanpa regresi (jumlah kasus
  tidak berubah dari sesi sebelumnya karena tidak ada test yang pernah
  menguji fitur synced-apps yang dihapus ini).

## 2026-07-31 — Keamanan (cookie/session-store), README/NOTICE, tool `oci_vm` + `rootd_fs`, memori lintas-sesi Cortex Agent

Empat perubahan independen dalam satu sesi:

**1. Fix: `commandGuard.ts` sebelumnya mengizinkan membaca cookie browser.**
Owner bertanya apakah RocSystem bisa membaca cookie browser lokal. Diuji
langsung ke `checkCommand()`: 5 perintah baca/salin file Cookies Chrome,
`cookies.sqlite` Firefox, dsb, semuanya `allowed: true` — `SENSITIVE_PATH_RE`
sebelumnya hanya menutupi kunci SSH/OCI/AWS/gh/.netrc/.git-credentials,
tidak pernah menutupi file cookie/session-store. Ditambal: pola baru untuk
profil Chromium (Chrome/Chromium/Edge/Brave/Opera desktop & Android
app-private) dan Firefox (`cookies.sqlite`, `logins.json`, `key4.db`),
`sqlite3` ditambahkan ke `READERS`. 6 test case baru ditambahkan di
`commandGuard.test.ts` (63 → 69 kasus).

**2. README: tabel "Related projects by the same author" dihapus, dipindah ke `NOTICE.md`.**
Fungsinya tidak berubah sama sekali (rootd-fs/termuxrd/termuxrd-cloud tetap
menjadi runtime environment RocSystem apa adanya, tidak diimpor sebagai
library) — hanya representasinya di README yang dihapus atas permintaan
owner. Atribusi lisensi (terutama Apache-2.0 dari roc-webui untuk desain
pipeline "engineering") dipindah utuh ke `NOTICE.md` baru, bukan dihapus
tanpa jejak, supaya kewajiban atribusi §4 Apache-2.0 tetap terpenuhi.

**3. Tool baru: `oci_vm` dan `rootd_fs` (`server/tools.ts` + `server/db.ts`).**
- `oci_vm` — lifecycle penuh VM Oracle Cloud (list/get/launch/power/resize/
  terminate) lewat `oci-cli` yang sudah terpasang & terkonfigurasi di
  device (`~/.oci/config`, tidak pernah dibaca RocSystem sendiri). Setiap
  panggilan dibangun sebagai argv array via `execFile` (bukan shell
  string), sehingga nilai parameter dari model tidak bisa lolos lewat
  metakarakter shell. `terminate` butuh `confirm:true` eksplisit.
- `rootd_fs` — menjalankan CLI `rootd` (github.com/ivansslo/rootd-fs) apa
  adanya sebagai tool eksekusi kontainer rootless; rootd-fs sendiri **tidak
  diubah sama sekali**. Subcommand dibatasi ke allowlist sesuai dokumentasi
  rootd-fs sendiri; `enter` (interaktif, butuh TTY) ditolak dengan arahan
  memakai `sh`; `rm`/`purge` (destruktif) butuh `confirm:true`.
- Keduanya tetap lewat `guardShell()` untuk audit log bersama dan gerbang
  `SHELL_GUARD=enforce|warn|off` yang sama dengan tool shell lain.
- Test baru `server/__tests__/ociVmRootdFs.test.ts` (14 kasus): validasi
  parameter wajib, penolakan aksi destruktif tanpa confirm, allowlist
  action/subcommand, dan pembuktian bahwa panggilan valid benar-benar
  mencapai `execFile` nyata (gagal ENOENT di sandbox ini karena `oci-cli`/
  `rootd` memang tidak terpasang di sana — bukti eksekusi asli, bukan stub).

**4. Memori lintas-sesi untuk Cortex Agent RocSystemInsight (`snowflake/06_agent_memory.sql`).**
Owner bertanya ke RocSystemInsight langsung di `ai.snowflake.com` soal
preferensi permanen; agent menjawab jujur bahwa ia tidak punya mekanisme
mengingat lintas sesi. Ditambahkan nyata: tabel `GOVERNANCE.AGENT_MEMORY`
(key/value) + 3 stored procedure (`SAVE_AGENT_MEMORY`, `GET_AGENT_MEMORY`,
`FORGET_AGENT_MEMORY`) di-wire sebagai custom tool (`type: generic`) pada
agent yang sama — `save_preference` / `get_preferences` / `forget_preference`.
Karena melekat di objek agent, bukan fitur sisi RocSystem, memori yang sama
terlihat baik dari `query_snowflake_insight` maupun dari Snowsight langsung.

**Diverifikasi live, sungguhan (bukan asumsi):** dijalankan langsung ke
akun Snowflake — tabel & 3 procedure berhasil dibuat, ownership agent
dipindah ke `ROCAGENTINSIGHT_ADMIN` (agent sebelumnya dimiliki role lain),
`CREATE OR REPLACE AGENT` dengan 4 tool (Cortex Analyst + 3 tool memori
baru) berhasil. Dites 3 panggilan HTTP terpisah (setara sesi chat baru
tiap kali): (1) "ingat preferensi X" → agent memanggil `save_preference`;
(2) di panggilan terpisah, "preferensi apa yang kamu ingat?" → agent
memanggil `get_preferences`, mengembalikan kedua nilai yang tersimpan;
(3) "lupakan preferensi bahasa" → agent memanggil `forget_preference`,
menghapus satu key sambil mempertahankan yang lain. Data uji dibersihkan;
`AGENT_MEMORY` production kosong, siap dipakai owner.

Verifikasi menyeluruh untuk #1–#3 (perubahan kode RocSystem):
- `npx tsc --noEmit` → 0 error
- `npx vite build` → sukses
- `npm test` → 6 suite, 134 kasus total (69 commandGuard + 9
  shellGuard.integration + 17 auth + 14 endpoints.integration + 14
  ociVmRootdFs + 11 rocvault), 0 gagal, tanpa regresi pada 114 kasus lama

## 2026-07-31 — UI: perkuat branding kartu Snowflake Cortex Agent (hackathon demo)

Owner sedang ikut Snowflake CoCo CLI Hackathon 2026 (Hack2Skill) dan ingin
RocSystemInsight "muncul sebagai dirinya" secara visual — bukan cuma detail
teknis kecil di antara tool lain — supaya jelas terlihat sebagai showcase
Cortex Agent nyata saat demo/dinilai juri.

- **`src/components/ChatMessage.tsx`** — `SnowflakeInsightCard` dirombak:
  - Ikon `CloudSnow` (bukan `Database` generik) dalam badge biru Snowflake,
    dengan gradient header sky-blue yang jelas berbeda dari kartu tool lain
    (yang netral abu-abu).
  - Nama agent (`RocSystemInsight`/`ROCAGENTINSIGHT`) ditampilkan besar +
    label kecil "Snowflake Cortex Agent" di bawahnya — bukan lagi teks kecil
    generik "Snowflake".
  - Baris badge baru: "Powered by Snowflake Cortex Agents — real API call,
    live semantic view" — penegasan eksplisit bahwa ini panggilan nyata,
    bukan simulasi, tanpa perlu expand JSON mentah untuk membuktikannya.
  - Kategori grup tool ("Snowflake Insight" di `ExecutionLogsGroup`) ikut
    memakai ikon & warna `CloudSnow`/sky yang sama untuk konsistensi.

Verifikasi di sandbox:
- `tsc --noEmit` → EXIT 0
- `npm test` (114 kasus) → semua lulus, nol regresi
- `npm run build` → sukses

## 2026-07-31 — UI: query_snowflake_insight tidak punya kartu tampilan sendiri

Owner bertanya kenapa "RocSystemInsight" tidak muncul di dropdown pilihan
model, dan merasa integrasi Snowflake "cuma jalan di log". Jawaban soal
dropdown: itu memang benar dan disengaja — RocSystemInsight adalah *tool*
yang dipanggil model chat yang sedang aktif, bukan model chat itu sendiri,
jadi tidak akan pernah ada di daftar model (Gemini/Groq/OpenAI/dst).

Tapi bagian "cuma jalan di log" itu menunjukkan bug UI nyata: tool
`query_snowflake_insight` (ditambahkan sesi sebelumnya) tidak pernah
didaftarkan ke pengelompokan visual `ExecutionLogsGroup` di
`ChatMessage.tsx`, sehingga jatuh ke kategori generik "Other Tools" dan
menampilkan JSON mentah — termasuk `raw_response` yang bisa sampai 12KB
dump SSE mentah dari Cortex Agent.

- **`src/components/ChatMessage.tsx`**:
  - `query_snowflake_insight` sekarang dikelompokkan sendiri ("Snowflake
    Insight", ikon Database biru) di `ExecutionLogsGroup`, bukan lagi jatuh
    ke "Other Tools".
  - `SnowflakeInsightCard` (baru) — kartu khusus yang menampilkan
    pertanyaan asli, jawaban bersih (`result.answer`), dan tool internal
    Cortex Agent yang dipakai (`result.tools_used`, mis.
    `rocquantum_ops_analyst, system_execute_sql`) — TIDAK PERNAH menampilkan
    `raw_response` mentah ke pengguna.

Verifikasi di sandbox:
- `tsc --noEmit` → EXIT 0
- `npm test` (114 kasus) → semua lulus, nol regresi
- `npm run build` → sukses

## 2026-07-31 — Fix: query_snowflake_insight mengembalikan jawaban terduplikasi

Owner melaporkan Cortex Agent "tidak berjalan" — investigasi lapangan (bukan
tebakan) menemukan DUA masalah terpisah:

1. **PAT Snowflake lama sudah di-revoke** (langkah keamanan yang benar dari
   owner) tapi belum diganti PAT baru di `cloud.env` — ini bukan bug kode,
   dikonfirmasi dengan menguji koneksi langsung: error Snowflake berubah dari
   `Network policy is required` (kemarin) menjadi
   `Programmatic access token is invalid` (sekarang), sesuai perilaku token
   yang benar-benar dicabut. Setelah PAT baru dipasang, koneksi berhasil.
2. **Bug nyata di `query_snowflake_insight`** (server/tools.ts): parser SSE
   mengumpulkan field `text` dari SETIAP event yang memilikinya, termasuk
   `response.thinking(.delta)` (penalaran internal model, bukan jawaban) dan
   `response.text` (yang me-replay ulang teks penuh yang SAMA di akhir tiap
   content block, bukan konten baru). Hasilnya: jawaban akhir mengandung teks
   pemikiran + jawaban terduplikasi dua kali berturut-turut.

Fix: parser sekarang melacak `event:` SSE saat ini dan HANYA mengumpulkan teks
dari event `response.text.delta` — satu-satunya event yang membawa potongan
teks jawaban yang benar-benar baru (streaming delta), konsisten dengan cara
`src/lib/chatStream.ts` dan `src/lib/agentOrchestraStream.ts` menangani event
serupa di frontend.

`snowflake/00_network_policy.sql` dan `snowflake/README.md` diperbarui:
opsi Network Rules (direkomendasikan Snowflake untuk policy baru, lihat
docs.snowflake.com/en/user-guide/network-policies) ditambahkan sebagai
alternatif `ALLOWED_IP_LIST` legacy, plus bagian Troubleshooting yang
mendokumentasikan kedua kegagalan di atas untuk insiden serupa di masa depan.

Verifikasi di sandbox:
- `tsc --noEmit` → EXIT 0
- `npm test` (114 kasus) → semua lulus, nol regresi
- `npm run build` → sukses
- **Reproduksi & konfirmasi nyata**: dipanggil langsung dengan PAT lama (gagal,
  `token is invalid`, mengonfirmasi dugaan) dan PAT baru (sebelum fix:
  jawaban terduplikasi persis seperti dilaporkan owner; sesudah fix: jawaban
  bersih, tanpa duplikasi, `tools_used` tetap mengonfirmasi
  `rocquantum_ops_analyst` + `system_execute_sql` dipanggil Cortex Agent)

## 2026-07-31 — Tool baru: query_snowflake_insight (integrasi Cortex Agent Snowflake)

Menambah satu tool baru ke RocSystem yang memanggil Cortex Agent Snowflake
"RocSystemInsight" (dibangun terpisah di akun Snowflake operator, lihat
`snowflake/README.md`), supaya Scout/Builder/role Agent Multi mana pun bisa
bertanya data operasional dalam bahasa natural.

- **`server/tools.ts`** — tool baru `query_snowflake_insight`: mem-POST ke
  endpoint REST Cortex Agents (`api/v2/databases/.../agents/...:run`),
  mem-parse response SSE-nya menjadi jawaban bersih (`answer`, `tools_used`),
  dan mengembalikan error jelas kalau `SNOWFLAKE_ACCOUNT`/`SNOWFLAKE_USER`/
  `SNOWFLAKE_PAT` belum diisi. Timeout 45s (lebih lama dari tool lain karena
  Cortex Agent butuh beberapa putaran tool-call internal sebelum menjawab).
- **`server/db.ts`** — deklarasi tool didaftarkan (17 tool inti sekarang,
  naik dari 16).
- **`docs/cloud.env.template`** dan **`docs/ENV_KEYS_LIST.md`** — variabel
  baru didokumentasikan: `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`,
  `SNOWFLAKE_PAT` (atau alias `SNOWFLAKE_KEY`), plus 3 variabel opsional
  (`SNOWFLAKE_INSIGHT_DB/SCHEMA/AGENT`) untuk override target agent.
- **`snowflake/`** (baru) — 5 skrip SQL + README yang membangun fondasi
  Cortex Agent "RocSystemInsight" dari nol: role/warehouse/database/schema,
  tabel `RAW`/`ANALYTICS` yang mencerminkan struktur `db.json` ExecutionLog,
  Semantic View native Snowflake, definisi Cortex Agent, dan panduan
  Business Continuity/DR (Database Replication manual untuk Enterprise
  Edition, dengan contoh Failover Group untuk Business Critical+ di masa
  depan).

Verifikasi di sandbox:
- `tsc --noEmit` → EXIT 0
- `npm test` (guard + auth + endpoints + rocvault, 114 kasus) → semua lulus,
  nol regresi
- `npm run build` → sukses
- **Panggilan nyata**: tool `query_snowflake_insight` dijalankan langsung
  (bukan mock) dengan kredensial Snowflake asli — berhasil memanggil Cortex
  Agent RocSystemInsight, menerima jawaban jujur bahwa tabel fakta operasional
  masih kosong (belum ada log RocSystem yang di-ingest), dan `tools_used`
  mengonfirmasi Cortex Agent benar-benar memakai `rocquantum_ops_analyst` +
  `system_execute_sql` secara internal.

## 2026-07-31 — Agent Multi: 8 role, 2 pipeline + CLI

Menambah pipeline kedua ke Agent Multi dan perintah CLI untuk memicunya.
Murni aditif — tidak ada perubahan di `orchestrator.ts`, `commandGuard.ts`,
`tools.ts`, atau `authMiddleware.ts`.

- **`server/agentOrchestra.ts`** — direfaktor untuk mendukung banyak pipeline
  (`AGENT_MULTI_PIPELINES`), bukan satu rantai 4-role hardcoded:
  - `fast` (sudah ada): Scout → Builder/Modder → Breaker → Closer.
  - **`engineering`** (baru) — diadaptasi dari 4-Step Engineering Orchestra
    milik [roc-webui](https://github.com/ivansslo/roc-webui) (Apache-2.0):
    Chief Architect → Lead Developer → Security Pentester → QA Supervisor.
    Berbeda dari roc-webui yang berjalan di atas simulator offline, di sini
    setiap role memakai tool RocSystem yang nyata — Architect membaca
    workspace sungguhan sebelum bikin blueprint, Developer menulis file asli
    (bukan cuma blok markdown), dan Pentester/QA menautkan skor/coverage-nya
    ke tool call yang benar-benar dijalankan.
  - Hand-off antar role kini generik (berdasar urutan pipeline), bukan
    hardcode nama role tertentu — jadi pipeline baru bisa ditambah tanpa
    mengubah logic hand-off.
  - `extractStepMeta()` mem-parsing tag `[ SCORE: A ]` / `[ COVERAGE: 94% ]`
    / `[ RELEASE: v1.0.0-rc1 ]` dari output role (konvensi yang sama dengan
    roc-webui) jadi `step.meta` terstruktur.
- **`server.ts`** — `POST /api/agents/orchestra/stream` menerima field baru
  `pipeline: "fast" | "engineering"` (default `fast`, jadi permintaan lama
  tanpa field ini tetap jalan seperti sebelumnya).
- **`src/types.ts`** — `AgentRole` diperluas ke 8 nilai; `AgentMultiPipelineId`
  dan `AgentStepMeta` baru.
- **`src/components/OrchestraVisualizer.tsx`** — ditulis ulang generik untuk
  N pipeline (`AGENT_LIBRARY` + `PIPELINE_ROLES`) alih-alih 4 posisi node
  hardcoded; menampilkan tag SCORE/COVERAGE/RELEASE di panel detail role.
- **`src/components/AgentOrchestraTab.tsx`** — pemilih pipeline (fast /
  engineering) sebelum launcher.
- **`rocquantum-cli.ts`** — perintah baru:
  - `/agents [fast|engineering] <tugas>` — jalankan pipeline, streaming SSE
    langsung ke terminal (parser SSE sama persis dengan
    `lib/agentOrchestraStream.ts` di web UI).
  - `/pipelines` — daftar kedua pipeline dan role-nya.
  - `tools/rocquantum-cli` (wrapper bash) — teks `--help` diperbarui.
- **README.md** — bagian "Agent Multi" ditulis ulang untuk 8 role/2 pipeline;
  atribusi roc-webui ditambahkan ke "Related projects".

Verifikasi di sandbox:
- `tsc --noEmit` → EXIT 0
- `npm test` (guard + auth + endpoints + rocvault, 105 kasus) → semua lulus,
  nol regresi
- `npm run build` → sukses; chunk `AgentOrchestraTab` tetap kecil (~21KB),
  bundle Chat default tidak berubah (~470KB)
- Smoke test SSE langsung (server sungguhan, dengan & tanpa cookie auth):
  pipeline `engineering` mengalir step-by-step untuk keempat role
  (architect/developer/pentester/qa); pipeline `fast` dan permintaan tanpa
  field `pipeline` tetap berjalan seperti sebelumnya (regresi nol)
- Parser SSE baru di `rocquantum-cli.ts` diuji terisolasi dengan frame SSE
  tiruan yang identik dengan yang ditulis `server.ts` — seluruh assertion
  lulus (event count, `pipeline` di `run_start`, `role` di setiap step,
  `meta.securityScore` ter-parse dari `step_done`)

## 2026-07-31 — Agent Multi: pipeline Scout → Builder/Modder → Breaker → Closer

Fitur baru, murni aditif — tidak ada satu baris pun di `orchestrator.ts`,
`commandGuard.ts`, `tools.ts`, atau `authMiddleware.ts` yang diubah.

- **`server/agentOrchestra.ts`** (baru) — menjalankan 4 role berurutan di atas
  `runOrchestrator` yang sudah ada, sehingga setiap tool call role tetap lewat
  shell guard, SSRF guard, auth, dan logging `db.json` yang sama persis dengan
  chat biasa:
  - **Scout** — recon cepat read-only (list/read/search file, `git status/log`),
    tidak menulis apa pun.
  - **Builder/Modder** — implementasi nyata: tulis/edit file, jalankan
    build/install/shell. Mengambil inisiatif, tidak bertanya balik ke user.
  - **Breaker** — coba jebol hasil Builder: cari celah OWASP-style, divalidasi
    lewat tool nyata.
  - **Closer** — baca 3 laporan sebelumnya, vonis cepat: PASS / PASS WITH
    NOTES / FAIL.
  - Kegagalan jujur: pipeline berhenti bila satu role gagal, bukan
    membiarkan role berikutnya mengarang kesimpulan dari data yang hilang.
- **`server.ts`** — endpoint baru `POST /api/agents/orchestra/stream` (SSE),
  pola identik `/api/chat/stream`.
- **`src/types.ts`** — `AgentRole` diganti dari set lama yang tidak
  terpakai (`architect|developer|pentester|qa` — tidak pernah di-import di
  manapun, tanpa backend) menjadi `scout|builder|breaker|closer`.
- **`src/components/OrchestraVisualizer.tsx`** — dihidupkan kembali (tadinya
  dead code, tidak pernah dirender) dan di-retheme ke 4 role baru; sekaligus
  memperbaiki bug lama `agent.name.split('_')[1]` yang akan pecah untuk nama
  tanpa underscore (diganti field `badge` eksplisit).
- **`src/lib/agentOrchestraStream.ts`** (baru) — SSE client, mengikuti
  framing `lib/chatStream.ts`.
- **`src/components/AgentOrchestraTab.tsx`** (baru) — launcher + visualizer
  live + panel verdict Closer. Lazy-loaded (`React.lazy`) seperti
  `SelfDevelopmentHub`, jadi bundle tab Chat default tidak membengkak.
- **`src/components/Sidebar.tsx`** / **`src/App.tsx`** — tab baru "Agent
  Multi" di navigasi.

Verifikasi di sandbox:
- `tsc --noEmit` → EXIT 0
- `npm test` (guard + auth + endpoints + rocvault, 105 kasus) → semua lulus,
  nol regresi
- `npm run build` → sukses; ukuran bundle awal Chat tidak berubah (~470KB)
  karena tab baru di-code-split ke chunk ~17KB terpisah
- Smoke test langsung ke server (SSE, dengan & tanpa cookie auth): auth wall
  tetap 401 tanpa login; pipeline 4-role mengalir step-by-step lewat SSE;
  fallback jujur muncul saat tidak ada API key provider terkonfigurasi.

## Cara menjalankan (lokal)
```bash
unzip roca-codex.zip
cd roca-codex
cp .env.example .env          # lalu isi minimal satu API key
npm install --legacy-peer-deps
npm run build                 # build frontend (dist/) + backend (dist/server.cjs)
npm start                     # jalankan server produksi -> http://localhost:3000
# atau mode dev: npm run dev
```

Isi minimal salah satu di `.env`:
```
GEMINI_API_KEY=...     # atau
GROQ_KEY=...           # atau
OPENROUTER_API_KEY=... # atau
OPENAI_API_KEY=...
```
Opsional proteksi password (akan memunculkan layar login):
```
WEB_PASSWORD=...
PORT=3000
```

## Ringkasan perubahan

### Backend
- **`server/orchestrator.ts`**
  - 4 persona nyata (balanced/creative/precision/casual) → `temperature`/`topP`/`topK` diteruskan ke semua provider.
  - **Token-streaming Gemini** (`generateContentStream`) + fallback non-streaming aman.
  - `MAX_TOOL_TURNS` 5 → 12 (agent menuntaskan tugas multi-langkah).
  - System prompt **goal-executing** (act → verify → report; jangan mengarang).
  - `robustFetch` ramping (hapus jebakan cURL +20s; timeout 8s).
  - Failover chain ramping (buang 5 alias aurora-* + jules).
  - Fallback **jujur** (bukan teks kaleng).
- **`server/db.ts`** — 43 → **16 tool inti** (+ reconcile db.json lama saat startup).
- **`server/tools.ts`** — 16 tool inti; `write`/`edit` auto-build **non-blocking**; guard ukuran file 256KB.
- **`server.ts`** — ~74 → ~30 endpoint nyata (purge mock + RCE/SSRF); containment check path; teruskan `persona`; endpoint status/login.
- **`server/authMiddleware.ts`** — **FIX bug autentikasi** (dulu selalu lolos); kini benar-benar 401 + login + token ber-KTB + logout.

### Frontend
- **`src/App.tsx`** — ~3.200 → ~340 baris (shell komposisi).
- Komponen baru: `Sidebar`, `Header`, `ChatView`, `SelfDevelopmentHub` (lazy/code-split), `NotificationDropdown` (lean, data nyata), `PersonaSelector`, `LoginGate`.
- `lib/chatStream.ts` (SSE streaming), `lib/persona.ts`.
- `ChatInput.tsx` — persona selector + tombol **Stop**.
- **Code-split**: bundle awal turun ~54% (SelfDevelopmentHub lazy).
- Buang blok mock UI (TURBO PROXY palsu, IP mesh, SSH fingerprint, Info alert).
- `vite.config.ts` — `manualChunks` vendor (react / recharts).

## Verifikasi (di sandbox)
- `tsc --noEmit` → EXIT 0
- `npm run build` → sukses (~2.844 modul)
- Boot server OK; `/api/health`, `/api/models`, streaming SSE, dan alur login (6/6) teruji runtime.

## Catatan
- Token-streaming Gemini butuh `GEMINI_API_KEY` asli untuk muncul per-token; tanpa key, alur fallback jujur yang muncul (sudah diuji).
- `rocd/` (Python), `n8n/`, `oci/`, `termux-rocd/` tidak diubah.

---

## 2026-07-30 — Hardening babak 2 (temuan review keamanan F1–F6 + perbaikan kualitas)

### Keamanan
- **F1 — celah bypass guard ditutup.** `self_develop_capability` → `execute` kini **nonaktif default**
  (`SELF_DEV_EXECUTE=true` untuk mengaktifkan secara sadar) + screening heuristik snippet
  (menolak `child_process`, `require(`, `eval`, `new Function`, akses `process.`, dsb.).
  Gate ini otomatis berlaku juga untuk cron scheduler.
- **F2 — `/api/ssh/exec` kini melewati `commandGuard`** (sebelumnya tanpa guard sama sekali);
  `guardShell` diekspor dari `tools.ts` sebagai satu choke point.
- **F3 — anti-SSRF pada tool `http_request`:** resolusi DNS dulu, tolak IP privat/loopback/
  link-local (metadata cloud `169.254.169.254`, tailnet `100.x`, LAN), tolak kredensial di URL,
  redirect diikuti manual dengan validasi ulang tiap hop (maks 5).
- **F4 — `/api/workspace/zip-dir` memakai `execFile` tanpa shell** (argumen array) — injeksi
  perintah lewat nama path berisi `"` tidak lagi mungkin.
- **F5 — permukaan kredensial & brute force:** login rate-limit (5 gagal → kunci 15 menit, per IP);
  `GET /api/env/config` membalut nilai rahasia (hanya 4 karakter terakhir); nilai yang masih
  bermask tidak bisa menimpa rahasia asli; mode `rawEnv` di `POST /api/env/update` kini berfungsi
  (sebelumnya selalu 400) dengan perlindungan mask yang sama.
- **F6 — containment path** memakai `path.relative` (menutup sibling-prefix bug); scrub **semua**
  varian token GitHub di output git/push; fallback repo default → `ivansslo/RocSystem`.

### Kualitas / koreksi
- Auto-build background kini **mengantre satu rebuild** bila ada edit selama build berjalan
  (sebelumnya edit terbuang → `dist/` basi).
- Log `db.json` dibatasi 2000 entri terbaru.
- Test baru `server/__tests__/auth.test.ts` (13 kasus: 401 tanpa token, alur cookie, path publik,
  lockout 429); `npm test` kini menjalankan guard + auth + rocvault.
- README: klaim "SQLite" dikoreksi (persistensi JSON `db.json`); `metadata.json` diselaraskan
  dengan nama produk.

---

## 2026-07-30 — Babak 3: kebersihan provider, rotasi sesi, test endpoint, isolasi OS (v5.22.0)

### Keamanan & kebenaran
- **Rotasi password runtime kini menginvalidasi semua sesi.** Mengganti `WEB_PASSWORD` lewat
  `/api/env/update` (tanpa restart) sebelumnya membiarkan token lama hidup sampai TTL 24 jam;
  middleware kini memeriksa nilai live tiap request dan membunuh semua token + lockout seketika.
  Password baru langsung berlaku tanpa restart.
- **`EnvEditor` diperbaiki (bug bawaan, bukan dari babak 2):** mapping field↔env tertukar
  (Tailscale←OR_KEY, IP←CF_AI_TOKEN, PAT←CF_ACCOUNT_ID) dikembalikan; payload form yang selalu
  ditolak server (object, bukan array) kini dikirim sebagai array `{key,value}` — tombol simpan
  akhirnya benar-benar berfungsi, dan nilai ter-mask aman (diskip server).

### Kebersihan
- **Dead code provider dihapus** (~140 baris): `callAuroRaX/Fun/Roc/Forty/UltiX` (lima alias
  Gemini identik) dan `callJulesAgent` (bot PR async, bukan chat) beserta cabang dispatcher &
  guard kuncinya. Chain tersisa: gemini, groq, openai, openrouter, cfai, roadqwen, oci/ollama.

### Testing
- `server/__tests__/endpoints.integration.test.ts` (16 kasus): boot server nyata di direktori
  temp, lalu uji auth wall, traversal & sibling-prefix, injeksi nama path di zip-dir, guard
  pada `/api/ssh/exec`, masking env end-to-end, 404 handler. `npm test` kini 5 suite.
- `auth.test.ts` bertambah: skenario rotasi password runtime (token lama mati, password baru
  langsung aktif).

### Operasional
- **Isolasi OS akhirnya punya resep:** `docs/ISOLASI-OS.md` (prinsip + matriks lapisan +
  checklist) dan `tools/setup-isolated-user.sh` (user `rocquantum` khusus + systemd unit dengan
  `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`; menolak jalan di
  Termux & non-systemd). Komentar "NOT YET DONE" di commandGuard kini menunjuk ke resep ini.
