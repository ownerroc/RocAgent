#!/usr/bin/env node
/**
 * RocSystem — proprietary software.
 * Copyright (c) 2026 Ivan Ssl (ivansslo). All rights reserved.
 * Unauthorised use, copying, modification, or distribution is prohibited.
 * See LICENSE in the project root.
 */

/**
 * rocsystem-cli — klien terminal untuk server RocSystem.
 *
 * Bicara ke server lokal lewat HTTP, sama seperti UI web, sehingga keduanya
 * berbagi sesi, memori, dan tool yang sama. Tidak memanggil penyedia model
 * secara langsung: seluruh trafik melewati orchestrator, jadi shell guard,
 * failover, dan pencatatan tetap berlaku.
 *
 * Pakai:
 *   rocvault run ~/.config/rocsystem/app.env.vault -- npm run cli
 *   rocvault run ~/.config/rocsystem/app.env.vault -- npm run cli -- "sebuah prompt"
 *
 * Perintah dalam sesi:
 *   /model [id]     lihat atau ganti model
 *   /persona [id]   lihat atau ganti persona
 *   /agents [pipeline] <task>   jalankan Agent Multi (8 role, 6 pipeline)
 *   /pipelines      daftar pipeline Agent Multi
 *   /new            mulai sesi baru
 *   /stat           status server dan penyedia
 *   /clear          bersihkan layar
 *   /help           bantuan
 *   /exit           keluar
 */

import readline from "node:readline";
import { stdin, stdout } from "node:process";

const C = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  red: "\x1b[31m", grn: "\x1b[32m", yel: "\x1b[33m",
  blu: "\x1b[34m", cyan: "\x1b[36m", mag: "\x1b[35m",
};

const PORT = process.env.PORT || "3000";
const BASE = process.env.ROCSYSTEM_URL || `http://127.0.0.1:${PORT}`;
const PASSWORD = process.env.WEB_PASSWORD || "";

// Mode CLI yang eksplisit (bukan dari NODE_ENV — itu env server, bukan mode CLI).
//   repl    = interaktif (default)
//   oneshot = satu prompt lalu keluar (sama seperti "rocsystem-cli 'prompt'")
//   agent   = langsung jalankan Agent Multi pipeline lalu keluar
let cliMode: "repl" | "oneshot" | "agent" = "repl";
let agentTask = "";

let cookie = "";
let model = "";
let provider = "";
let persona = "auto";
let sessionId = `cli-${Date.now()}`;
const history: { role: string; text: string }[] = [];

const out = (s = "") => stdout.write(s + "\n");
const err = (s: string) => stdout.write(`${C.red}✗${C.reset} ${s}\n`);
const ok = (s: string) => stdout.write(`${C.grn}✓${C.reset} ${s}\n`);
const dim = (s: string) => stdout.write(`${C.dim}${s}${C.reset}\n`);

async function req(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> || {}),
  };
  if (cookie) headers.Cookie = cookie;
  return fetch(`${BASE}${path}`, { ...init, headers });
}

/** Server hidup? Beri diagnosis yang bisa ditindaklanjuti, bukan sekadar "gagal". */
async function checkServer(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch {
    err(`Server tidak merespons di ${BASE}`);
    out("");
    dim("  Jalankan di terminal lain:");
    dim("    cd ~/RocSystem");
    dim("    rocvault run ~/.config/rocsystem/app.env.vault -- npm start");
    out("");
    dim("  Atau pakai server lain:  ROCSYSTEM_URL=http://host:port");
    return false;
  }
}

async function login(): Promise<boolean> {
  if (!PASSWORD) {
    err("WEB_PASSWORD tidak ada di environment.");
    dim("  Jalankan lewat rocvault supaya env termuat:");
    dim("    rocvault run ~/.config/rocsystem/app.env.vault -- npm run cli");
    return false;
  }
  const r = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ password: PASSWORD }),
  });
  if (!r.ok) {
    err("Login ditolak — WEB_PASSWORD tidak cocok dengan yang dipakai server.");
    dim("  Server dan CLI harus memuat vault yang sama.");
    return false;
  }
  const sc = r.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  return true;
}

async function loadModels(): Promise<boolean> {
  const r = await req("/api/models");
  if (!r.ok) { err(`/api/models -> HTTP ${r.status}`); return false; }
  const d = await r.json();
  const usable = (d.models || []).filter((m: any) => m.active !== false);

  if (!usable.length) {
    err("Tidak ada model yang tersedia — tidak ada kunci API yang terbaca server.");
    dim("  rocvault edit ~/.config/rocsystem/app.env.vault");
    return false;
  }

  const preferred = usable.find((m: any) => m.provider === d.active_provider) || usable[0];
  model = preferred.id;
  provider = preferred.provider;

  dim(`  provider aktif : ${d.active_provider}`);
  dim(`  model siap     : ${usable.length} dari ${d.models.length}`);
  return true;
}

/** Kirim prompt dan alirkan jawabannya. */
async function ask(text: string): Promise<void> {
  history.push({ role: "user", text });

  const started = Date.now();
  let spinner: NodeJS.Timeout | undefined;
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  spinner = setInterval(() => {
    stdout.write(`\r${C.cyan}${frames[i++ % frames.length]}${C.reset} berpikir… `);
  }, 80);
  const stopSpinner = () => {
    if (spinner) { clearInterval(spinner); spinner = undefined; stdout.write("\r\x1b[K"); }
  };

  try {
    // Streaming (SSE) — sama seperti UI web: token muncul bertahap, tidak menunggu
    // seluruh jawaban selesai (model reasoning bisa lama). Frame event diurai di sini.
    const r = await req("/api/chat/stream", {
      method: "POST",
      body: JSON.stringify({ messages: history, model, provider, persona, sessionId }),
    });
    if (!r.ok || !r.body) {
      stopSpinner();
      err(`HTTP ${r.status} dari /api/chat/stream`);
      const body = await r.text().catch(() => "");
      dim(body.slice(0, 300));
      history.pop(); // hapus prompt user yang gagal
      return;
    }

    let acc = "";
    let finalLogs: any[] = [];
    let gotFirst = false;
    await consumeAgentOrchestraStream(r.body as any, (event, data) => {
      switch (event) {
        case "status":
          // status progres (mis. nama provider) — tampilkan sekali saja sebagai info
          break;
        case "chunk": {
          const t = typeof data === "string" ? data : (data?.text || "");
          if (!t) break;
          if (!gotFirst) { stopSpinner(); gotFirst = true; }
          acc += t;
          stdout.write(t);
          break;
        }
        case "tool_start":
          stopSpinner();
          dim(`  ⚙ ${data?.toolName || "(tool)"}`);
          break;
        case "tool_result": {
          const name = data?.toolName || "(tool)";
          if (data?.result?.status === "error") err(`  ✗ ${name}: ${data?.result?.message || ""}`);
          break;
        }
        case "done":
          finalLogs = Array.isArray(data?.logs) ? data.logs : [];
          break;
        case "error":
          stopSpinner();
          err(typeof data === "string" ? data : data?.error || "stream error");
          break;
      }
    });
    stopSpinner();

    // Pastikan ada newline setelah token stream.
    if (gotFirst) stdout.write("\n");

    const reply = acc.trim() || "(tidak ada teks dalam respons)";
    history.push({ role: "model", text: reply });

    const secs = ((Date.now() - started) / 1000).toFixed(1);
    dim(`  ${secs}s · ${model}${finalLogs.length ? ` · ${finalLogs.length} tool` : ""}`);
  } catch (e: any) {
    stopSpinner();
    err(`Permintaan gagal: ${e?.message || e}`);
    history.pop();
  }
}

async function cmdModel(arg: string) {
  const r = await req("/api/models");
  const d = await r.json();
  const models = d.models || [];

  if (!arg) {
    out(`${C.bold}Model${C.reset}  ${C.dim}(aktif: ${model})${C.reset}`);
    for (const m of models) {
      const mark = m.id === model ? `${C.grn}●${C.reset}` : m.active === false ? `${C.dim}○${C.reset}` : " ";
      const icon = m.icon || "  ";
      const name = m.name || m.id;
      const badge = typeof m.name === "string" && /default/i.test(m.name) ? ` ${C.dim}(default)${C.reset}` : "";
      if (m.active === false) {
        out(`  ${mark} ${icon} ${C.dim}${name} — tanpa kunci (${m.provider})${C.reset}`);
      } else {
        out(`  ${mark} ${icon} ${name}${badge} ${C.dim}· ${m.id}${C.reset}`);
      }
    }
    dim("  /model <id> untuk mengganti");
    return;
  }

  const found = models.find((m: any) => m.id === arg || m.id.includes(arg));
  if (!found) { err(`Model tidak dikenal: ${arg}`); return; }
  if (found.active === false) {
    err(`${found.id} tidak punya kunci API (${found.provider})`);
    dim("  rocvault edit ~/.config/rocsystem/app.env.vault");
    return;
  }
  model = found.id; provider = found.provider;
  ok(`Model: ${model} (${provider})`);
}

function cmdPersona(arg: string) {
  const list = [
    ["auto", "pilih otomatis sesuai konteks"],
    ["balanced", "jelas, akurat, to-the-point"],
    ["creative", "eksploratif & bervariasi"],
    ["precise", "faktual & ringkas, untuk coding"],
    ["casual", "rileks & ramah"],
  ];
  if (!arg) {
    out(`${C.bold}Persona${C.reset}  ${C.dim}(aktif: ${persona})${C.reset}`);
    for (const [id, desc] of list) {
      out(`  ${id === persona ? `${C.grn}●${C.reset}` : " "} ${id.padEnd(10)} ${C.dim}${desc}${C.reset}`);
    }
    return;
  }
  if (!list.some(([id]) => id === arg)) { err(`Persona tidak dikenal: ${arg}`); return; }
  persona = arg;
  ok(`Persona: ${persona}`);
}

async function cmdStat() {
  const r = await req("/api/models");
  const d = await r.json();
  out(`${C.bold}Status${C.reset}`);
  out(`  server    ${BASE}`);
  out(`  mode cli  ${cliMode}`);
  out(`  provider  ${d.active_provider}`);
  out(`  tersedia  ${(d.configured_providers || []).join(", ") || "—"}`);
  out(`  model     ${model}`);
  out(`  persona   ${persona}`);
  out(`  sesi      ${sessionId} (${history.length} pesan)`);
}

// ─── Agent Multi (8 role di 6 pipeline) ─────────────────────────────
// Sama seperti UI web: memanggil /api/agents/orchestra/stream (SSE), yang
// menjalankan runOrchestrator per role lewat orkestrator yang sama — shell
// guard, SSRF guard, dan pencatatan db.json tetap berlaku persis seperti
// chat biasa. CLI hanya mem-parsing frame SSE dan mencetaknya ke terminal.
const PIPELINE_ROLES: Record<string, string[]> = {
  fast: ["scout", "builder", "breaker", "closer"],
  engineering: ["architect", "developer", "pentester", "qa"],
  "fast-building": ["scout", "builder", "closer"],
  "self-development": ["architect", "developer", "qa"],
  "self-fixed": ["breaker", "builder", "closer"],
  "self-restored": ["scout", "architect", "builder", "closer"],
};
const PIPELINE_DESC: Record<string, string> = {
  fast: "Scout → Builder/Modder → Breaker → Closer — cepat, inisiatif tinggi",
  engineering: "Chief Architect → Lead Developer → Security Pentester → QA Supervisor — pipeline rekayasa penuh",
  "fast-building": "Scout → Builder/Modder → Closer — build cepat",
  "self-development": "Chief Architect → Lead Developer → QA — kembangkan fitur",
  "self-fixed": "Breaker → Builder/Modder → Closer — diagnosis → perbaiki → verifikasi",
  "self-restored": "Scout → Architect → Builder/Modder → Closer — inspeksi → rollback → restore",
};
const ROLE_LABEL: Record<string, string> = {
  scout: "Scout", builder: "Builder/Modder", breaker: "Breaker", closer: "Closer",
  architect: "Chief Architect", developer: "Lead Developer", pentester: "Security Pentester", qa: "QA Supervisor",
};

function cmdPipelines() {
  out(`${C.bold}Pipeline Agent Multi${C.reset}`);
  for (const [id, roles] of Object.entries(PIPELINE_ROLES)) {
    out(`  ${C.cyan}${id}${C.reset}  ${C.dim}${PIPELINE_DESC[id]}${C.reset}`);
    dim(`    role: ${roles.map((r) => ROLE_LABEL[r]).join(" → ")}`);
  }
  dim("  /agents [fast|engineering|fast-building|self-development|self-fixed|self-restored] <task> untuk menjalankan");
}

/** Parser SSE minimal untuk stream fetch() Node — sama framing dengan lib/agentOrchestraStream.ts. */
async function consumeAgentOrchestraStream(body: ReadableStream<Uint8Array>, onEvent: (event: string, data: any) => void) {
  const reader = (body as any).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event: ")) { currentEvent = line.slice(7).trim(); continue; }
      if (line.startsWith("data: ")) {
        const raw = line.slice(6);
        let data: any = raw;
        try { data = JSON.parse(raw); } catch { /* keep raw string */ }
        onEvent(currentEvent, data);
      }
    }
  }
}

async function cmdAgents(arg: string) {
  const parts = arg.trim().split(/\s+/);
  let pipeline = "fast";
  let taskParts = parts;
  if (parts[0] in PIPELINE_ROLES) {
    pipeline = parts[0];
    taskParts = parts.slice(1);
  }
  const task = taskParts.join(" ").trim();

  if (!task) {
    err("Tugas kosong.");
    dim(`  Pakai: /agents [fast|engineering|fast-building|self-development|self-fixed|self-restored] <deskripsi tugas>`);
    dim(`  Lihat pipeline: /pipelines`);
    return;
  }

  const roles = PIPELINE_ROLES[pipeline];
  out(`${C.mag}${C.bold}▶ Agent Multi${C.reset} ${C.dim}(${pipeline}: ${roles.map((r) => ROLE_LABEL[r]).join(" → ")})${C.reset}`);
  out("");

  let resp: Response;
  try {
    resp = await req("/api/agents/orchestra/stream", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ id: "cli_agent_multi", role: "user", text: task }],
        model, provider, persona, pipeline,
      }),
    });
  } catch (e: any) {
    err(`Permintaan gagal: ${e?.message || e}`);
    return;
  }

  if (!resp.ok || !resp.body) {
    err(`HTTP ${resp.status} dari /api/agents/orchestra/stream`);
    return;
  }

  let finalStatus = "unknown";
  await consumeAgentOrchestraStream(resp.body as any, (event, data) => {
    switch (event) {
      case "run_start":
        dim(`  ${data?.message || "pipeline dimulai"}`);
        break;
      case "step_start":
        out(`${C.cyan}${C.bold}◆ ${ROLE_LABEL[data.role] || data.role}${C.reset} ${C.dim}sedang bekerja…${C.reset}`);
        break;
      case "step_tool_start":
        dim(`    ⚙ ${data.toolName || data.tool || "(tool)"}`);
        break;
      case "step_done": {
        const meta = data.meta || {};
        const tags = [
          meta.securityScore ? `SCORE:${meta.securityScore}` : null,
          meta.qaCoverage ? `COVERAGE:${meta.qaCoverage}` : null,
          meta.releaseTag ? `RELEASE:${meta.releaseTag}` : null,
        ].filter(Boolean).join(" ");
        ok(`${ROLE_LABEL[data.role] || data.role} selesai${tags ? ` ${C.dim}[${tags}]${C.reset}` : ""}`);
        if (data.output) out(`  ${data.output.split("\n").join("\n  ")}`);
        out("");
        break;
      }
      case "step_failed":
        err(`${ROLE_LABEL[data.role] || data.role} gagal: ${data.error}`);
        break;
      case "done":
      case "run_done":
        finalStatus = data?.status || finalStatus;
        break;
      case "error":
        err(typeof data === "string" ? data : data?.error || "stream error");
        break;
    }
  });

  if (finalStatus === "completed") ok("Pipeline selesai.");
  else if (finalStatus === "failed") err("Pipeline berhenti karena error.");
}

function banner() {
  out("");
  out(`${C.mag}${C.bold}  ⚡ RocSystem CLI${C.reset}  ${C.dim}${BASE}${C.reset}  ${C.dim}[mode: ${cliMode}]${C.reset}`);
  out("");
}

function help() {
  out(`${C.bold}Perintah${C.reset}`);
  out(`  ${C.cyan}/model${C.reset} [id]     lihat / ganti model`);
  out(`  ${C.cyan}/persona${C.reset} [id]   lihat / ganti persona`);
  out(`  ${C.cyan}/agents${C.reset} [fast|engineering|fast-building|self-development|self-fixed|self-restored] <tugas>`);
  out(`           jalankan Agent Multi (8 role, 6 pipeline)`);
  out(`  ${C.cyan}/pipelines${C.reset}      daftar pipeline Agent Multi & role-nya`);
  out(`  ${C.cyan}/new${C.reset}            sesi baru (riwayat dikosongkan)`);
  out(`  ${C.cyan}/stat${C.reset}           status server & penyedia`);
  out(`  ${C.cyan}/clear${C.reset}          bersihkan layar`);
  out(`  ${C.cyan}/help${C.reset}           bantuan ini`);
  out(`  ${C.cyan}/exit${C.reset}           keluar`);
  out("");
  dim("  Teks lain dikirim sebagai prompt.");
  out("");
  dim("  Mode (saat run):");
  dim("    npm run cli                       # repl (interaktif)");
  dim('    npm run cli -- "prompt"            # oneshot (satu prompt)');
  dim('    npm run cli -- --mode agent "task" # langsung Agent Multi');
}

async function main() {
  // Parse flag CLI sederhana sebelum apa pun.
  //   --mode repl | oneshot | agent
  //   --agent "<task>"  (alias singkat untuk mode agent)
  const argv = process.argv.slice(2);
  for (let k = 0; k < argv.length; k++) {
    if (argv[k] === "--mode" && argv[k + 1]) {
      const m = argv[k + 1].toLowerCase();
      if (["repl", "oneshot", "agent"].includes(m)) cliMode = m as any;
      k++;
    } else if (argv[k] === "--agent" && argv[k + 1]) {
      cliMode = "agent";
      agentTask = argv[k + 1];
      k++;
    }
  }

  banner();
  if (!await checkServer()) process.exit(1);
  if (!await login()) process.exit(1);
  if (!await loadModels()) process.exit(1);
  ok(`Siap — ${model} (${provider}) · mode: ${cliMode}`);

  // Mode agent: langsung jalankan pipeline lalu keluar.
  if (cliMode === "agent") {
    await cmdAgents(agentTask || argv.filter(a => !a.startsWith("--")).join(" "));
    process.exit(0);
  }

  // Mode oneshot / argumen posisi: satu prompt lalu keluar.
  const oneShot = argv.filter(a => !a.startsWith("--")).join(" ").trim();
  if (cliMode === "oneshot" || oneShot) {
    if (oneShot) await ask(oneShot);
    process.exit(0);
  }

  // Mode repl (default): interaktif.
  out("");
  dim("  /help untuk perintah, /exit untuk keluar");
  out("");

  const rl = readline.createInterface({
    input: stdin, output: stdout,
    prompt: `${C.blu}${C.bold}❯${C.reset} `,
  });
  rl.prompt();

  rl.on("line", async (line) => {
    const t = line.trim();
    if (!t) { rl.prompt(); return; }

    if (t.startsWith("/")) {
      const [cmd, ...rest] = t.slice(1).split(/\s+/);
      const arg = rest.join(" ");
      switch (cmd) {
        case "exit": case "quit": case "q": rl.close(); return;
        case "help": case "h": help(); break;
        case "clear": stdout.write("\x1b[2J\x1b[H"); banner(); break;
        case "model": case "m": await cmdModel(arg); break;
        case "persona": case "p": cmdPersona(arg); break;
        case "agents": case "orchestra": await cmdAgents(arg); break;
        case "pipelines": cmdPipelines(); break;
        case "stat": case "status": await cmdStat(); break;
        case "new":
          history.length = 0;
          sessionId = `cli-${Date.now()}`;
          ok("Sesi baru");
          break;
        default:
          err(`Perintah tidak dikenal: /${cmd}`);
          dim("  /help untuk daftar");
      }
      rl.prompt();
      return;
    }

    await ask(t);
    rl.prompt();
  });

  rl.on("close", () => { out(""); dim("  sampai jumpa"); process.exit(0); });
}

main().catch((e) => { err(String(e?.message || e)); process.exit(1); });
