/**
 * RocSystem — proprietary software.
 * Copyright (c) 2026 Ivan Ssl (ivansslo). All rights reserved.
 * Unauthorised use, copying, modification, or distribution is prohibited.
 * See LICENSE in the project root.
 */
import express from "express";
import { EventEmitter } from "events";
import path from "path";
import fs from "fs";
import dns from "dns";
import zlib from "zlib";
import dotenv from "dotenv";
// Vercel Production Mode: Hanya RocAgentInsight (Snowflake) yang aktif
// Agent inti tidak di-include untuk hack2skill Snowflake saja
const VERCEL_PRODUCTION_MODE = process.env.VERCEL_PRODUCTION_SNOWFLAKE_ONLY === 'true';

import { runOrchestrator } from "./server/orchestrator.js";
import { runAgentOrchestra } from "./server/agentOrchestra.js";
import { db } from "./server/db.js";
import { initScheduler } from "./server/scheduler.js";
import { createAuthMiddleware } from "./server/authMiddleware.js";
import { toolImplementations, sshExec, guardShell } from "./server/tools.js";
import { getWorkspaces, getActiveWorkspace, addWorkspace, removeWorkspace, setActiveWorkspace } from "./server/workspaces.js";

if (VERCEL_PRODUCTION_MODE) {
  console.log("🔒 Vercel Production Mode: ONLY RocAgentInsight (Snowflake) is active");
}

if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config();
process.env.DISABLE_HMR = 'true';

// OPTIMASI MEMORY: Kurangi EventEmitter listeners dari default 100
EventEmitter.defaultMaxListeners = 10;

// Periodic garbage collection untuk mencegah memory leak
// Hanya berjalan jika flag --expose-gc tersedia (bukan default)
if (global.gc) {
  setInterval(() => {
    console.log('[GC] Running periodic garbage collection...');
    global.gc();
  }, 60000); // Setiap 60 detik
}

// Fail-closed security gate: the server refuses to start without a password.
// Previously auth was optional (`if (process.env.WEB_PASSWORD)`), which meant a
// missing env var silently produced a fully open server bound to 0.0.0.0.
const WEB_PASSWORD = process.env.WEB_PASSWORD || "";
const MIN_PASSWORD_LENGTH = 12;

if (!WEB_PASSWORD) {
  console.error(
    "\n❌ REFUSING TO START: environment variable WEB_PASSWORD is not set.\n" +
    "   This server can execute shell commands. Running it unauthenticated is unsafe.\n" +
    "   Set one, e.g.:  export WEB_PASSWORD=\"$(openssl rand -base64 24)\"\n"
  );
  process.exit(1);
}

if (WEB_PASSWORD.length < MIN_PASSWORD_LENGTH) {
  console.error(
    `\n❌ REFUSING TO START: WEB_PASSWORD is too short (${WEB_PASSWORD.length} chars, minimum ${MIN_PASSWORD_LENGTH}).\n` +
    "   Generate a strong one:  export WEB_PASSWORD=\"$(openssl rand -base64 24)\"\n"
  );
  process.exit(1);
}

// Bind to loopback by default. Exposing a shell-executing server on 0.0.0.0 puts it
// on every network the device is attached to (including public Wi-Fi).
// Override deliberately with HOST=... only when you know the network is trusted
// (e.g. a Tailscale-only address).
const HOST = process.env.HOST || "127.0.0.1";

// Containment check done right: `fullPath.startsWith(cwd)` also passes for a
// SIBLING directory (`/repo-evil` starts with `/repo`). path.relative() cannot
// be fooled that way. Every path-taking endpoint below uses this.
function isInsideCwd(fullPath: string): boolean {
  const rel = path.relative(process.cwd(), fullPath);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

// Secrets are masked in API responses: an authenticated session, a screenshot
// or a shared screen must not casually reveal full key material. Fields keep
// their last 4 characters so keys remain recognisable. POST /api/env/update
// refuses to write a value that still carries this mask (see below).
const ENV_SECRET_RE = /(KEY|TOKEN|SECRET|PASS|PWD|PAT|URI|PRIVATE|CREDENTIAL)/;
const ENV_MASK_PREFIX = "••••";
function maskEnvValue(key: string, value: string): string {
  if (!value || !ENV_SECRET_RE.test(key)) return value;
  return value.length <= 4 ? ENV_MASK_PREFIX : ENV_MASK_PREFIX + value.slice(-4);
}

export const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

if (HOST !== "127.0.0.1" && HOST !== "localhost" && HOST !== "::1") {
  console.warn(
    `\n⚠️  HOST=${HOST} — server is reachable beyond this device. ` +
    "Make sure the network is trusted (Tailscale/VPN), not open Wi-Fi.\n"
  );
}

if (!VERCEL_PRODUCTION_MODE) {
  initScheduler();
}

  // Lightweight gzip compression for JSON API responses (uses Node's built-in
  // zlib, no extra dependency). Only wraps res.send/res.json, so the SSE chat
  // streams below (which write directly via res.write) are untouched — gzip
  // would otherwise buffer and break real-time streaming.
  const COMPRESSION_MIN_BYTES = 1024;
  app.use((req, res, next) => {
    const acceptEncoding = req.headers["accept-encoding"] || "";
    if (!acceptEncoding.includes("gzip")) return next();

    const originalSend = res.send.bind(res);
    res.send = ((body: any) => {
      if (res.getHeader("Content-Encoding") || typeof body === "undefined" || body === null) {
        return originalSend(body);
      }
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
      if (buf.length < COMPRESSION_MIN_BYTES) return originalSend(body);

      zlib.gzip(buf, (err, compressed) => {
        if (err) return originalSend(body);
        res.setHeader("Content-Encoding", "gzip");
        res.setHeader("Vary", "Accept-Encoding");
        res.removeHeader("Content-Length");
        originalSend(compressed);
      });
      return res;
    }) as typeof res.send;
    next();
  });

  // BATASI BODY SIZE: 2MB max (mencegah memory spike dari request besar)
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  // Mandatory password protection (validated above; the process exits if unset).
  app.use(createAuthMiddleware(WEB_PASSWORD));

  app.get("/api/health", (req, res) => {
    // JANGAN pakai nama "mode" — dulu "mode: NODE_ENV" membuat model salah tafsir
    // sebagai "mode rocenv-cli = production". Field dijelaskan eksplisit.
    res.json({ status: "ok", nodeEnv: process.env.NODE_ENV || "development", cliCompatible: true });
  });

  // Public: tells the frontend whether password protection is enabled.
  app.get("/api/auth/status", (req, res) => {
    res.json({ protected: true });
  });

  app.get("/api/models", (req, res) => {
    // Ketersediaan dihitung dari kunci yang benar-benar ada, bukan dikeraskan
    // ke `active: true`. Sebelumnya kesembilan model selalu tampil aktif di UI
    // meski hanya satu penyedia yang punya kunci, sehingga memilih model mana
    // pun terlihat sah tetapi gagal tanpa penjelasan.
    const have = {
      cfsherlock: !!(process.env.CF_SHERLOCK_KEY || process.env.CLOUDFERRO_SHERLOCK_API_KEY || process.env.CLOUDFERRO_KEY),
      gitlabduo: !!(process.env.GITLAB_DUO_KEY || process.env.GITLAB_TOKEN || process.env.GITLAB_PAT),
      requesty: !!(process.env.REQUESTY_API_KEY || process.env.REQUESTY_KEY),
      // New providers for personal models
      oracle: !!(process.env.ORACLE_API_KEY || process.env.OCI_API_KEY || process.env.ORACLE_GENAI_KEY),
      byteplus: !!(process.env.BYTEPLUS_API_KEY || process.env.BYTEPLUS_TOKEN),
      cfai: !!(process.env.CF_AI_TOKEN || process.env.CF_TOKEN || process.env.CF_API_TOKEN),
    } as Record<string, boolean>;

    const catalog = [
      // === ACTIVE MODELS (CloudFerro Sherlock) — hanya model nyata yang dipakai ===
      { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B (Default)", provider: "cfsherlock", icon: "🧠" },
      { id: "mistralai/Mistral-Small-4-119B-2603", name: "Mistral Small 4 (Fast)", provider: "cfsherlock", icon: "⚡" },
      { id: "MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5", provider: "cfsherlock", icon: "🌀" },
      { id: "MiniMaxAI/MiniMax-M3", name: "MiniMax M3 (Fast)", provider: "cfsherlock", icon: "⚡" },
      { id: "openai/gpt-5.6-sol-xhigh", name: "GPT-5.6 Sol XHigh", provider: "cfsherlock", icon: "🚀" },
    ];

    const models = catalog.map(m => ({
      ...m,
      active: have[m.provider] === true,
      reason: have[m.provider] ? undefined : `Tidak ada kunci API untuk ${m.provider}`,
    }));

    // PROVIDER boleh berupa daftar (mis. "groq,openai"). Yang aktif adalah
    // entri PERTAMA yang benar-benar punya kunci — mengembalikan daftar mentah
    // membuat UI mencari provider bernama daftar itu dan gagal.
    // GEMINI DIHAPUS TOTAL — alias google/xgoog/googleai diarahkan ke cfsherlock
    // supaya PROVIDER lama yang masih menyebut gemini tidak merusak pemilihan.
    const ALIAS: Record<string, string> = {
      xgoog: "cfsherlock", google: "cfsherlock", googleai: "cfsherlock", gemini: "cfsherlock",
      deepseek: "openrouter", deepsek: "openrouter",
      cf: "cfai", cloudflare: "cfai",
      sherlock: "cfsherlock", cloudferro: "cfsherlock",
    };
    const wanted = (process.env.PROVIDER || "")
      .toLowerCase().split(",").map(x => ALIAS[x.trim()] || x.trim()).filter(Boolean);

    const activeProvider =
      wanted.find(p => have[p]) ||
      // cfsherlock (GPT-OSS) adalah default UTAMA. Gemini telah dihapus total.
      (have.cfsherlock ? "cfsherlock" : have.openai ? "openai" : have.groq ? "groq" :
       have.openrouter ? "openrouter" : have.cfai ? "cfai" : "cfsherlock");

    res.json({
      active_provider: activeProvider,
      configured_providers: Object.keys(have).filter(k => have[k]),
      // Urutan failover yang diminta lewat PROVIDER, setelah alias & penyaringan.
      failover_chain: wanted.filter(p => have[p]),
      models,
    });
  });

  // --- Multi-workspace (setiap workspace = satu folder proyek) ---
  app.get("/api/workspaces", (req, res) => {
    try {
      res.json({ active: getActiveWorkspace(), workspaces: getWorkspaces() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/workspaces/active", (req, res) => {
    try {
      const { id } = req.body || {};
      const w = setActiveWorkspace(id);
      res.json({ active: w });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/workspaces", (req, res) => {
    try {
      const { name, path: p, source } = req.body || {};
      if (!name || !p) return res.status(400).json({ error: "name dan path wajib." });
      const w = addWorkspace({ name, path: p, source });
      res.json({ active: w, workspaces: getWorkspaces() });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Clone repo GitHub menjadi workspace baru (butuh PAT di body).
  app.post("/api/workspaces/clone", async (req, res) => {
    try {
      const { repoUrl, name, token } = req.body || {};
      if (!repoUrl || !name) return res.status(400).json({ error: "repoUrl dan name wajib." });
      if (!token) return res.status(400).json({ error: "GitHub token (PAT) wajib untuk clone." });

      const home = process.env.HOME || "/data/data/com.termux/files/home";
      const target = path.join(home, name);

      if (fs.existsSync(target)) {
        return res.status(400).json({ error: `Folder ${target} sudah ada. Pilih nama lain.` });
      }

      const { exec } = await import("child_process");
      const util = await import("util");
      const execAsync = util.promisify(exec);

      // Sanitasi repoUrl: hanya boleh https://github.com/owner/repo(.git)
      const cleanUrl = String(repoUrl).trim();
      if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/.test(cleanUrl)) {
        return res.status(400).json({ error: "URL harus berbentuk https://github.com/owner/repo" });
      }
      const authUrl = cleanUrl.replace(/^https:\/\//, `https://${token}@`);

      await execAsync(`git clone --depth 1 ${JSON.stringify(authUrl)} ${JSON.stringify(target)}`, { timeout: 300100 });

      const w = addWorkspace({ name, path: target, source: cleanUrl });
      res.json({ active: w, workspaces: getWorkspaces() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/workspaces/:id", (req, res) => {
    try {
      removeWorkspace(req.params.id);
      res.json({ active: getActiveWorkspace(), workspaces: getWorkspaces() });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Non-streaming chat
  app.post("/api/chat", async (req, res) => {
    // Vercel Production: hanya Snowflake yang aktif
    if (VERCEL_PRODUCTION_MODE) {
      return res.status(403).json({ error: "Chat disabled in Vercel production mode. Only Snowflake analytics available." });
    }
    try {
      const { messages, model, provider, persona } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages array" });
      }
      const result = await runOrchestrator(messages, { model, provider, persona });
      res.json(result);
    } catch (error: any) {
      console.error("Orchestrator Error:", error);
      res.status(500).json({ error: error.message || "Failed to process request" });
    }
  });

  // Streaming chat (SSE) — preferred path for low perceived latency (first token fast)
  app.post("/api/chat/stream", async (req, res) => {
    // Vercel Production: hanya Snowflake yang aktif
    if (VERCEL_PRODUCTION_MODE) {
      res.setHeader("Content-Type", "text/event-stream");
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Chat disabled in Vercel production mode. Only Snowflake analytics available." })}\n\n`);
      return res.end();
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    try {
      const { messages, model, provider, persona } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Invalid messages array" })}\n\n`);
        return res.end();
      }

      res.write(`event: status\ndata: ${JSON.stringify({ message: "Initializing Orchestrator..." })}\n\n`);

      const result = await runOrchestrator(messages, {
        model, provider, persona,
        onProgress: (evt) => {
          res.write(`event: ${evt.type}\ndata: ${JSON.stringify(evt.data)}\n\n`);
          if (evt.type === 'tool_output' || evt.type === 'tool_start' || evt.type === 'tool_result') {
            broadcastToTerminal(evt.type, evt.data);
          }
        }
      });

      res.write(`event: done\ndata: ${JSON.stringify(result)}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Stream Orchestrator Error:", error);
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || "Streaming failed" })}\n\n`);
      res.end();
    }
  });

  // Parallel chat (SSE) — Mistral Small 4 + GPT-OSS 120B side by side.
  // Both runOrchestrator calls share the same persona (module-level ACTIVE_PERSONA_ID
  // is written identically by both), so concurrent execution is safe. Each lane's
  // events are tagged with `model` so the client can route them to the right column.
  app.post("/api/chat/parallel", async (req, res) => {
    if (VERCEL_PRODUCTION_MODE) {
      res.setHeader("Content-Type", "text/event-stream");
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Chat disabled in Vercel production mode." })}\n\n`);
      return res.end();
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    try {
      const { messages, persona } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Invalid messages array" })}\n\n`);
        return res.end();
      }

      const lanes = [
        { id: "mistral", label: "Mistral Small 4", model: "mistralai/Mistral-Small-4-119B-2603", provider: "cfsherlock" },
        { id: "gptoss", label: "GPT-OSS 120B", model: "openai/gpt-oss-120b", provider: "cfsherlock" },
      ];

      res.write(`event: parallel_models\ndata: ${JSON.stringify(lanes.map(l => ({ id: l.id, label: l.label })))}\n\n`);

      const runLane = async (lane: any) => {
        try {
          const result = await runOrchestrator(messages, {
            model: lane.model,
            provider: lane.provider,
            persona,
            onProgress: (evt) => {
              res.write(`event: ${evt.type}\ndata: ${JSON.stringify({ ...evt.data, model: lane.id, modelLabel: lane.label })}\n\n`);
              if (evt.type === 'tool_output' || evt.type === 'tool_start' || evt.type === 'tool_result') {
                broadcastToTerminal(evt.type, evt.data);
              }
            }
          });
          return { id: lane.id, label: lane.label, text: result?.text || "", ok: true };
        } catch (e: any) {
          return { id: lane.id, label: lane.label, text: `⚠️ ${e?.message || e}`, ok: false };
        }
      };

      const results = await Promise.all(lanes.map(runLane));
      const byId: Record<string, any> = {};
      for (const r of results) byId[r.id] = { label: r.label, text: r.text, ok: r.ok };

      res.write(`event: done\ndata: ${JSON.stringify({ results: byId })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Parallel Orchestrator Error:", error);
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || "Parallel streaming failed" })}\n\n`);
      res.end();
    }
  });

  // Agent Multi — 8 roles across 2 selectable pipelines (SSE).
  //   pipeline=fast (default): Scout -> Builder/Modder -> Breaker -> Closer
  //   pipeline=engineering: Chief Architect -> Lead Developer ->
  //                         Security Pentester -> QA Supervisor
  //     (adapted from github.com/ivansslo/roc-webui's 4-agent orchestra,
  //     Apache-2.0, rebuilt on real RocAgent tools)
  // Same request/response shape as /api/chat/stream on purpose: it reuses
  // runOrchestrator underneath (see server/agentOrchestra.ts), so it inherits
  // auth, the shell guard, the SSRF guard and db logging without any changes
  // to those files.
  app.post("/api/agents/orchestra/stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    // Vercel Production: hanya Snowflake yang aktif
    if (VERCEL_PRODUCTION_MODE) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Agent Orchestra disabled in Vercel production mode. Only Snowflake analytics available." })}\n\n`);
      return res.end();
    }

    try {
      const { messages, model, provider, persona, pipeline } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Invalid messages array" })}\n\n`);
        return res.end();
      }

      res.write(`event: run_start\ndata: ${JSON.stringify({ message: "Agent Multi pipeline starting...", pipeline: pipeline || "fast" })}\n\n`);

      const result = await runAgentOrchestra(messages, {
        model, provider, persona, pipeline,
        onProgress: (evt) => {
          res.write(`event: ${evt.type}\ndata: ${JSON.stringify(evt.data)}\n\n`);
          if (evt.type === "step_tool_start" || evt.type === "step_tool_result") {
            broadcastToTerminal(evt.type, evt.data);
          }
        }
      });

      res.write(`event: done\ndata: ${JSON.stringify(result)}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Agent Orchestra Stream Error:", error);
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || "Agent Multi streaming failed" })}\n\n`);
      res.end();

    }
  });

  // Live terminal output stream
  const terminalClients: Set<any> = new Set();
  app.get("/api/terminal-stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();
    terminalClients.add(res);

    const pinger = setInterval(() => {
      try {
        res.write(": ping\n\n");
        if ((res as any).flush) (res as any).flush();
      } catch (_) {}
    }, 10000);

    req.on("close", () => {
      clearInterval(pinger);
      terminalClients.delete(res);
    });
  });

  function broadcastToTerminal(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of terminalClients) {
      try {
        client.write(payload);
        if (typeof client.flush === "function") client.flush();
      } catch (_) {}
    }
    // Trigger GC setelah broadcast besar untuk bebaskan memory
    if (global.gc && payload.length > 10240) {
      global.gc();
    }
  }

  // ---- Workspace ----
  // These endpoints used to walk the filesystem with readdirSync/statSync
  // recursively and synchronously — a full-repo stat scan that blocked the
  // Node event loop (and every other in-flight request) for the duration of
  // the scan. That's especially bad here since the sidebar/file browser
  // polls these on a timer. Now: fs.promises + concurrent stats, plus a
  // short-lived cache so rapid repeat polls don't re-walk the tree.
  const WORKSPACE_CACHE_TTL_MS = 4000;
  const workspaceCache = new Map<string, { ts: number; data: any }>();

  async function getFolderStatsAsync(dirPath: string): Promise<{ filesCount: number; sizeBytes: number }> {
    let filesCount = 0, sizeBytes = 0;
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    } catch (_) {
      return { filesCount, sizeBytes };
    }
    const results = await Promise.all(entries.map(async (entry) => {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') return null;
      const full = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          return await getFolderStatsAsync(full);
        } else {
          const stats = await fs.promises.stat(full);
          return { filesCount: 1, sizeBytes: stats.size };
        }
      } catch (_) {
        return null;
      }
    }));
    for (const r of results) {
      if (!r) continue;
      filesCount += r.filesCount;
      sizeBytes += r.sizeBytes;
    }
    return { filesCount, sizeBytes };
  }

  app.get("/api/workspace/sessions", async (req, res) => {
    try {
      const cached = workspaceCache.get("sessions");
      if (cached && Date.now() - cached.ts < WORKSPACE_CACHE_TTL_MS) {
        return res.json(cached.data);
      }

      const sessionsDir = path.join(process.cwd(), "sessions");
      await fs.promises.mkdir(sessionsDir, { recursive: true });
      const chatSessions = db.getChatSessions();
      const chatMap = new Map(chatSessions.map(s => [s.id, s.title]));
      const items = await fs.promises.readdir(sessionsDir, { withFileTypes: true });

      const result = (await Promise.all(items.map(async (item) => {
        if (!item.isDirectory()) return null;
        const fullPath = path.join(sessionsDir, item.name);
        try {
          const [folderStats, sessionFileNames] = await Promise.all([
            getFolderStatsAsync(fullPath),
            fs.promises.readdir(fullPath).then(names => names.filter(f => !f.startsWith('.'))),
          ]);
          const files = await Promise.all(sessionFileNames.map(async (file) => ({
            name: file,
            path: `sessions/${item.name}/${file}`,
            sizeBytes: (await fs.promises.stat(path.join(fullPath, file))).size,
          })));
          return {
            id: item.name,
            title: chatMap.get(item.name) || item.name.replace(/^session_/, 'Chat Session '),
            path: `sessions/${item.name}`,
            filesCount: folderStats.filesCount,
            sizeBytes: folderStats.sizeBytes,
            files,
          };
        } catch (_) {
          return null;
        }
      }))).filter(Boolean);

      workspaceCache.set("sessions", { ts: Date.now(), data: result });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/workspace/tree", async (req, res) => {
    try {
      const showHidden = req.query.showHidden === 'true';
      const cacheKey = `tree:${showHidden}`;
      const cached = workspaceCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < WORKSPACE_CACHE_TTL_MS) {
        return res.json(cached.data);
      }

      const rootDir = process.cwd();
      const items = await fs.promises.readdir(rootDir, { withFileTypes: true });

      const result = (await Promise.all(items.map(async (item) => {
        if (!showHidden && item.name.startsWith('.')) return null;
        if (item.name === 'node_modules' || item.name === 'dist') return null;
        const fullPath = path.join(rootDir, item.name);
        try {
          if (item.isDirectory()) {
            const folderStats = await getFolderStatsAsync(fullPath);
            return { name: item.name, path: item.name, isDirectory: true, filesCount: folderStats.filesCount, sizeBytes: folderStats.sizeBytes };
          } else {
            const stats = await fs.promises.stat(fullPath);
            return { name: item.name, path: item.name, isDirectory: false, filesCount: 1, sizeBytes: stats.size };
          }
        } catch (_) {
          return null;
        }
      }))).filter(Boolean) as any[];

      result.sort((a, b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0));
      workspaceCache.set(cacheKey, { ts: Date.now(), data: result });
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/workspace/zip-dir", async (req, res) => {
    try {
      const targetPath = (req.query.path as string || "").replace(/\.\./g, "");
      const fullPath = path.resolve(process.cwd(), targetPath || ".");
      if (!isInsideCwd(fullPath)) {
        return res.status(400).json({ error: "Path outside workspace" });
      }
      if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "Target path not found" });
      // execFile WITHOUT a shell: previously the target path travelled inside a
      // double-quoted shell string — a `"` in the name escaped the quotes and
      // injected arbitrary commands. Argument arrays cannot inject. `zip`
      // interprets its own -x patterns internally, so no shell is needed.
      const { execFile } = await import("child_process");
      const { promisify } = await import("util");
      const execFileAsync = promisify(execFile) as (file: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;
      const safeName = targetPath ? targetPath.replace(/[/\\?%*:|"<>]/g, '_') : 'workspace-full';
      const zipName = `${safeName}-archive.zip`;
      const tempZipPath = path.join(process.cwd(), zipName);
      await execFileAsync("zip", ["-r", "-q", tempZipPath, targetPath || ".", "-x", "node_modules/*", ".git/*", "dist/*", "*.zip"]);
      res.download(tempZipPath, zipName, () => {
        if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
      });
    } catch (err: any) { res.status(500).json({ error: err.message || "Failed to generate ZIP archive" }); }
  });

  app.delete("/api/workspace/item", (req, res) => {
    try {
      const targetPath = (req.query.path as string || "").replace(/\.\./g, "");
      if (!targetPath) return res.status(400).json({ error: "Path parameter required" });
      const fullPath = path.resolve(process.cwd(), targetPath);
      if (!isInsideCwd(fullPath)) return res.status(400).json({ error: "Path outside workspace" });
      if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "Path not found" });
      if (fs.statSync(fullPath).isDirectory()) fs.rmSync(fullPath, { recursive: true, force: true });
      else fs.unlinkSync(fullPath);
      res.json({ status: "success", message: `Deleted ${targetPath}` });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ---- Chat sessions ----
  app.get("/api/chat-sessions", (req, res) => {
    try { res.json(db.getChatSessions()); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/chat-sessions", (req, res) => {
    try {
      const { session } = req.body;
      if (!session || !session.id) return res.status(400).json({ error: "Invalid session object" });
      db.saveChatSession(session);
      const sessionDirPath = path.join(process.cwd(), "sessions", session.id);
      if (!fs.existsSync(sessionDirPath)) {
        fs.mkdirSync(sessionDirPath, { recursive: true });
        fs.writeFileSync(path.join(sessionDirPath, "README.md"),
          `# Project Workspace for ${session.title}\n\nCreated: ${session.createdAt || new Date().toISOString()}\nSession ID: ${session.id}\n`);
      }
      res.json({ status: "success", session, sessionDirPath });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/chat-sessions/:id/rename", (req, res) => {
    try {
      const { title } = req.body;
      if (!title) return res.status(400).json({ error: "Title parameter required" });
      db.renameChatSession(req.params.id, title);
      res.json({ status: "success", message: `Renamed session ${req.params.id}` });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/chat-sessions/:id", (req, res) => {
    try {
      db.deleteChatSession(req.params.id);
      res.json({ status: "success", message: `Session ${req.params.id} deleted` });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ---- Memories ----
  app.get("/api/memories", (req, res) => {
    try { res.json(db.getMemories()); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  app.post("/api/memories", (req, res) => {
    try {
      const { key, value, category } = req.body;
      if (!key || !value) return res.status(400).json({ error: "Key and value required" });
      db.saveMemory(key, value, category || 'general');
      res.json({ status: "success", message: "Memory saved" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  app.delete("/api/memories/:key", (req, res) => {
    try { db.deleteMemory(req.params.key); res.json({ status: "success", message: `Deleted memory ${req.params.key}` }); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ---- Self capabilities ----
  app.get("/api/self-capabilities", (req, res) => {
    try { res.json(db.getSelfCapabilities()); } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  app.post("/api/self-capabilities", (req, res) => {
    try {
      const { name, codeSnippet, purpose, category } = req.body;
      if (!name || !codeSnippet) return res.status(400).json({ error: "Name and codeSnippet required" });
      const id = db.saveSelfCapability(name, codeSnippet, purpose || '', category || 'general');
      res.json({ status: "success", id });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  app.patch("/api/self-capabilities/:id/pin", (req, res) => {
    try { res.json({ id: req.params.id, isPinned: db.togglePinSelfCapability(req.params.id) }); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  app.patch("/api/self-capabilities/:id/dependencies", (req, res) => {
    try {
      const { dependencies } = req.body;
      db.updateSelfCapabilityDependencies(req.params.id, dependencies || []);
      res.json({ status: "success" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ---- Web search & logs ----
  app.post("/api/web-search", async (req, res) => {
    try {
      const { query, depth, category } = req.body;
      if (!query) return res.status(400).json({ error: "Query is required" });
      const searchRes = await toolImplementations.webSearch({ query, depth, category });
      res.json(searchRes);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/capability-logs/:name", (req, res) => {
    try {
      const nameDecoded = decodeURIComponent(req.params.name);
      const logs = db.getLogs().filter(l =>
        (l.toolName === "selfDevelop" && (l.args?.name === nameDecoded || l.args?.name === req.params.name)) ||
        (l.args?.capabilityName === nameDecoded || l.args?.capabilityName === req.params.name)
      );
      res.json(logs);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/routines/:name/history", (req, res) => {
    try {
      const nameDecoded = decodeURIComponent(req.params.name);
      const logs = db.getLogs().filter(l =>
        (l.toolName === "selfDevelop" && (l.args?.name === nameDecoded || l.args?.name === req.params.name)) ||
        (l.args?.capabilityName === nameDecoded || l.args?.capabilityName === req.params.name)
      );
      res.json(logs);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/upload", (req, res) => {
    try {
      const { filename, content } = req.body;
      if (!filename || content === undefined) return res.status(400).json({ error: "Filename and content required" });
      const fullPath = path.resolve(process.cwd(), filename);
      if (!isInsideCwd(fullPath)) return res.status(400).json({ error: "Path outside workspace" });
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
      res.json({ status: "success", path: filename });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ---- Files ----
  app.get("/api/files", (req, res) => {
    try {
      const files = fs.readdirSync(process.cwd()).filter(f => !['node_modules', '.git', 'dist'].includes(f));
      res.json(files);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/files/content", (req, res) => {
    try {
      const filePath = (req.query.path as string || "").replace(/\.\./g, "");
      if (!filePath) return res.status(400).send("Path parameter required");
      const fullPath = path.resolve(process.cwd(), filePath);
      if (!isInsideCwd(fullPath)) return res.status(400).send("Path outside workspace");
      if (!fs.existsSync(fullPath)) return res.status(404).send("File not found");
      const content = fs.readFileSync(fullPath, "utf-8");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(content);
    } catch (err: any) { res.status(500).send(err.message); }
  });

  // ---- .env management (used by EnvEditor + AiProviderValidator) ----
  app.get("/api/env/config", (req, res) => {
    try {
      const envPath = path.join(process.cwd(), ".env");
      const rawEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
      // Values are masked before leaving the server (see maskEnvValue). The UI
      // still shows which keys are set and their last 4 chars, but the full
      // secret never travels to a browser session, log or screenshot.
      const envVars: { key: string; value: string; isSet: boolean; masked: boolean }[] = [];
      const maskedRawLines: string[] = [];
      for (const line of rawEnv.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (m) {
          // GEMINI DIHAPUS TOTAL — jangan tampilkan key Gemini di pengaturan,
          // meski barisnya masih tersisa di .env lama.
          if (["GEMINI_API_KEY", "GEMINI_KEY", "GOOGLE_API_KEY", "X_GOOG_API_KEY"].includes(m[1])) continue;
          const v = m[2].replace(/^["']|["']$/g, "");
          const masked = maskEnvValue(m[1], v);
          envVars.push({ key: m[1], value: masked, isSet: v.length > 0, masked: masked !== v });
          maskedRawLines.push(`${m[1]}=${masked}`);
        } else {
          maskedRawLines.push(line); // comments and blank lines pass through
        }
      }
      res.json({ rawEnv: maskedRawLines.join("\n"), envVars, masking: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/env/update", (req, res) => {
    try {
      const { envs, rawEnv } = req.body;
      if (!Array.isArray(envs) && typeof rawEnv !== "string") {
        return res.status(400).json({ error: "envs array or rawEnv string required" });
      }
      const envPath = path.join(process.cwd(), ".env");
      let lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8").split("\n") : [];
      let applied = 0, keptMasked = 0;

      // A value still carrying the display mask means "field was shown to the
      // user, never re-typed" — it must NEVER overwrite the real secret on disk.
      const isMaskedValue = (v: string) => v.trimStart().startsWith(ENV_MASK_PREFIX);

      if (Array.isArray(envs)) {
        for (const item of envs) {
          const key = String(item?.key || "");
          if (!/^[A-Z0-9_]+$/.test(key)) continue;
          const v = String(item?.value ?? "");
          if (isMaskedValue(v)) { keptMasked++; continue; }
          process.env[key] = v;
          const idx = lines.findIndex(l => new RegExp(`^\\s*${key}\\s*=`).test(l));
          if (idx >= 0) lines[idx] = `${key}=${v}`;
          else lines.push(`${key}=${v}`);
          applied++;
        }
      } else {
        // Raw text mode (this path previously did not exist — the UI's raw
        // editor silently failed with 400). Comments and blanks pass through;
        // masked secret lines keep the value currently on disk; new plain
        // values are applied to both the file and process.env.
        const currentVal = new Map<string, string>();
        for (const l of lines) {
          const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
          if (m) currentVal.set(m[1], m[2]);
        }
        lines = (rawEnv as string).split("\n").map((l: string) => {
          const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
          if (!m) return l;
          const key = m[1], val = m[2];
          if (isMaskedValue(val)) {
            if (currentVal.has(key)) { keptMasked++; return `${key}=${currentVal.get(key)}`; }
            return l; // masked value for an unknown key: store nothing new
          }
          process.env[key] = val;
          applied++;
          return l;
        });
      }

      fs.writeFileSync(envPath, lines.join("\n").replace(/\n{3,}/g, "\n\n") + "\n", "utf-8");
      try { dotenv.config({ override: true }); } catch {}
      res.json({ success: true, applied, keptMasked, message: `.env diperbarui (${applied} nilai diterapkan, ${keptMasked} mask dipertahankan) & dimuat ulang` });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/env/status", async (req, res) => {
    // Benar-benar memanggil endpoint tiap penyedia. Versi sebelumnya hanya
    // memeriksa apakah variabel env terisi lalu melabelinya "valid", sementara
    // UI mengklaim sedang "pinging REST endpoints & measuring latency". Kunci
    // yang dicabut atau kuotanya habis tetap tampil hijau, sehingga panel ini
    // menyesatkan justru ketika paling dibutuhkan.
    const first = (...names: string[]) => names.map(n => process.env[n]).find(Boolean) || "";

    type P = { name: string; status: "valid" | "invalid" | "missing"; latencyMs?: number; detail?: string };

    const timed = async (name: string, key: string, run: () => Promise<Response>): Promise<P> => {
      if (!key) return { name, status: "missing" };
      const t0 = Date.now();
      try {
        const r = await run();
        const latencyMs = Date.now() - t0;
        if (r.ok) return { name, status: "valid", latencyMs };
        const body = await r.text().catch(() => "");
        // Bedakan kunci mati dari kuota habis: keduanya membuat penyedia tidak
        // bisa dipakai, tapi tindakan perbaikannya sama sekali berbeda.
        let detail = `HTTP ${r.status}`;
        if (r.status === 429 || /quota|rate.?limit/i.test(body)) detail = "Kuota / rate limit habis";
        else if (r.status === 401 || r.status === 403) detail = "Kunci ditolak";
        else if (/insufficient_quota/i.test(body)) detail = "Saldo kredit habis";
        return { name, status: "invalid", latencyMs, detail };
      } catch (e: any) {
        return { name, status: "invalid", latencyMs: Date.now() - t0, detail: e?.name === "TimeoutError" ? "Timeout" : "Tidak terjangkau" };
      }
    };

    const sig = () => AbortSignal.timeout(8000);

    const groq = first("GROQ_KEY", "GROQ_API_KEY");
    const openai = first("OPENAI_API_KEY", "OPENAI_KEY");
    const openrouter = first("OPENROUTER_API_KEY", "OR_KEY", "OPENROUTER_KEY");
    const cfToken = first("CF_AI_TOKEN", "CF_TOKEN");
    const cfAcct = first("CF_ACCOUNT_ID");

    const providers = await Promise.all([
      timed("Groq", groq, () => fetch("https://api.groq.com/openai/v1/models",
        { headers: { Authorization: `Bearer ${groq}` }, signal: sig() })),
      timed("OpenAI", openai, () => fetch("https://api.openai.com/v1/models",
        { headers: { Authorization: `Bearer ${openai}` }, signal: sig() })),
      timed("OpenRouter", openrouter, () => fetch("https://openrouter.ai/api/v1/models",
        { headers: { Authorization: `Bearer ${openrouter}` }, signal: sig() })),
      timed("Cloudflare AI", cfToken && cfAcct ? cfToken : "", () => fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAcct}/ai/models/search?per_page=1`,
        { headers: { Authorization: `Bearer ${cfToken}` }, signal: sig() })),
    ]);

    // Cloudflare perlu dua nilai; bedakan "belum diisi" dari "ditolak".
    if (cfToken && !cfAcct) {
      const i = providers.findIndex(p => p.name === "Cloudflare AI");
      if (i >= 0) providers[i] = { name: "Cloudflare AI", status: "missing", detail: "CF_ACCOUNT_ID belum diisi" };
    }

    res.json({ providers, checkedAt: new Date().toISOString() });
  });

  // ---- SSH Daemon (local device) config + exec ----
  app.get("/api/ssh/config", (req, res) => {
    res.json({
      host: process.env.SSH_HOST || "127.0.0.1",
      port: process.env.SSH_PORT || "8022",
      user: process.env.SSH_USER || "",
      password: process.env.SSH_PASSWORD ? "***" : "",
      keyPath: process.env.SSH_KEY_PATH || "/storage/emulated/0/SshDaemon/ssh_host_rsa_key"
    });
  });

  app.post("/api/ssh/config", async (req, res) => {
    try {
      const { host, port, user, password, keyPath } = req.body || {};
      const envPath = path.join(process.cwd(), ".env");
      let lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8").split("\n") : [];
      const setEnv = (key: string, value: string) => {
        if (value === undefined || value === "***") return;
        process.env[key] = value;
        const idx = lines.findIndex(l => new RegExp(`^\\s*${key}\\s*=`).test(l));
        if (idx >= 0) lines[idx] = `${key}=${value}`;
        else lines.push(`${key}=${value}`);
      };
      setEnv("SSH_HOST", String(host ?? ""));
      setEnv("SSH_PORT", String(port ?? ""));
      setEnv("SSH_USER", String(user ?? ""));
      setEnv("SSH_PASSWORD", String(password ?? ""));
      setEnv("SSH_KEY_PATH", String(keyPath ?? ""));
      fs.writeFileSync(envPath, lines.join("\n").replace(/\n{3,}/g, "\n\n") + "\n", "utf-8");
      try { dotenv.config({ override: true }); } catch {}
      res.json({ success: true, message: "SSH config disimpan & dimuat ulang" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ---- Database & Analytics (Snowflake & Neon DB) config + status ----
  app.get("/api/db/config", (req, res) => {
    const snowflakeAccount = process.env.SNOWFLAKE_ACCOUNT || "";
    const snowflakeUser = process.env.SNOWFLAKE_USER || "";
    const snowflakePat = process.env.SNOWFLAKE_PAT || process.env.SNOWFLAKE_KEY || "";
    const snowflakeDb = process.env.SNOWFLAKE_INSIGHT_DB || "ROCAGENTINSIGHT_DB";
    const snowflakeSchema = process.env.SNOWFLAKE_INSIGHT_SCHEMA || "GOVERNANCE";
    const snowflakeAgent = process.env.SNOWFLAKE_INSIGHT_AGENT || "ROCAGENTINSIGHT";
    const neonUri = process.env.NEON_URI || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "";

    const snowflakeActive = Boolean(snowflakeAccount.trim() && snowflakeUser.trim() && snowflakePat.trim());
    const neonActive = Boolean(neonUri.trim());

    res.json({
      snowflake: {
        active: snowflakeActive,
        account: snowflakeAccount,
        user: snowflakeUser,
        pat: snowflakePat ? "***" : "",
        database: snowflakeDb,
        schema: snowflakeSchema,
        agent: snowflakeAgent
      },
      neon: {
        active: neonActive,
        uri: neonUri ? (neonUri.startsWith("postgres") ? `${neonUri.slice(0, 15)}...***` : "***") : ""
      }
    });
  });

  app.post("/api/db/config", async (req, res) => {
    try {
      const { snowflakeAccount, snowflakeUser, snowflakePat, snowflakeDb, snowflakeSchema, snowflakeAgent, neonUri } = req.body || {};
      const envPath = path.join(process.cwd(), ".env");
      let lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8").split("\n") : [];
      const setEnv = (key: string, value: string | undefined) => {
        if (value === undefined || value === "***" || (typeof value === "string" && value.endsWith("***"))) return;
        const valStr = String(value);
        process.env[key] = valStr;
        const idx = lines.findIndex(l => new RegExp(`^\\s*${key}\\s*=`).test(l));
        if (idx >= 0) lines[idx] = `${key}=${valStr}`;
        else lines.push(`${key}=${valStr}`);
      };

      setEnv("SNOWFLAKE_ACCOUNT", snowflakeAccount);
      setEnv("SNOWFLAKE_USER", snowflakeUser);
      setEnv("SNOWFLAKE_PAT", snowflakePat);
      setEnv("SNOWFLAKE_INSIGHT_DB", snowflakeDb);
      setEnv("SNOWFLAKE_INSIGHT_SCHEMA", snowflakeSchema);
      setEnv("SNOWFLAKE_INSIGHT_AGENT", snowflakeAgent);
      setEnv("NEON_URI", neonUri);

      fs.writeFileSync(envPath, lines.join("\n").replace(/\n{3,}/g, "\n\n") + "\n", "utf-8");
      try { dotenv.config({ override: true }); } catch {}

      const sfActive = Boolean((process.env.SNOWFLAKE_ACCOUNT || "").trim() && (process.env.SNOWFLAKE_USER || "").trim() && (process.env.SNOWFLAKE_PAT || process.env.SNOWFLAKE_KEY || "").trim());
      const nActive = Boolean((process.env.NEON_URI || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "").trim());

      res.json({
        success: true,
        message: `Konfigurasi database tersimpan. Snowflake: ${sfActive ? "AKTIF ✅" : "TIDAK AKTIF ⚪"}, Neon DB: ${nActive ? "AKTIF ✅" : "TIDAK AKTIF ⚪"}`
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/db/test", async (req, res) => {
    try {
      const sfAccount = (process.env.SNOWFLAKE_ACCOUNT || "").trim();
      const sfUser = (process.env.SNOWFLAKE_USER || "").trim();
      const sfPat = (process.env.SNOWFLAKE_PAT || process.env.SNOWFLAKE_KEY || "").trim();
      const sfActive = Boolean(sfAccount && sfUser && sfPat);

      const neonUri = (process.env.NEON_URI || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "").trim();
      const neonActive = Boolean(neonUri);

      const messages: string[] = [];
      if (sfActive) {
        messages.push(`[Snowflake Cortex] ✅ AKTIF — Akun: ${sfAccount}, User: ${sfUser}, Agent: ${process.env.SNOWFLAKE_INSIGHT_AGENT || "ROCAGENTINSIGHT"}`);
      } else {
        messages.push(`[Snowflake Cortex] ⚪ TIDAK AKTIF — Lengkapi SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, dan SNOWFLAKE_PAT.`);
      }

      if (neonActive) {
        const isSsl = neonUri.includes("sslmode=require");
        messages.push(`[Neon Postgres DB] ✅ AKTIF — URI terkonfigurasi (${isSsl ? "SSL diaktifkan" : "Tanpa sslmode=require"})`);
      } else {
        messages.push(`[Neon Postgres DB] ⚪ TIDAK AKTIF — Lengkapi NEON_URI.`);
      }

      res.json({
        success: true,
        snowflakeActive: sfActive,
        neonActive: neonActive,
        report: messages.join("\n")
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ssh/exec", async (req, res) => {
    try {
      const command = String(req.body?.command || "");
      // Same choke point as the sshRun TOOL — this endpoint previously ran
      // commands with no guard at all. SHELL_GUARD applies here too.
      const blocked = guardShell("api/ssh/exec", command);
      if (blocked) return res.status(403).json(blocked);
      const r = await sshExec(command);
      res.json(r);
    } catch (err: any) { res.status(500).json({ status: "error", error: err.message }); }
  });

  app.post("/api/ssh/generate-keys", async (req, res) => {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      const home = process.env.HOME || "/data/data/com.termux/files/home";
      const sshDir = path.join(home, ".ssh");
      if (!fs.existsSync(sshDir)) fs.mkdirSync(sshDir, { recursive: true });
      const keyPath = path.join(sshDir, "rocagent_key");
      try { fs.unlinkSync(keyPath); fs.unlinkSync(keyPath + ".pub"); } catch {}
      try {
        await execAsync(`ssh-keygen -t ed25519 -f ${JSON.stringify(keyPath)} -N "" -C "rocagent"`, { timeout: 15000 });
      } catch (e: any) {
        return res.status(500).json({ error: "ssh-keygen gagal. Jalankan sekali: pkg install openssh. (" + e.message + ")" });
      }
      const pubKey = fs.existsSync(keyPath + ".pub") ? fs.readFileSync(keyPath + ".pub", "utf-8").trim() : "";

      // Best-effort: pasang pubkey ke authorized_keys daemon
      const authKeys = "/sdcard/SshDaemon/authorized_keys";
      let autoInstalled = false, autoInstallError = "";
      try {
        const dir = path.dirname(authKeys);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const existing = fs.existsSync(authKeys) ? fs.readFileSync(authKeys, "utf-8") : "";
        if (!existing.includes(pubKey)) fs.appendFileSync(authKeys, pubKey + "\n", "utf-8");
        autoInstalled = true;
      } catch (e: any) { autoInstallError = e.message; }

      // Simpan SSH_KEY_PATH ke .env + process.env
      process.env.SSH_KEY_PATH = keyPath;
      const envPath = path.join(process.cwd(), ".env");
      let lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8").split("\n") : [];
      const idx = lines.findIndex(l => /^\s*SSH_KEY_PATH\s*=/.test(l));
      if (idx >= 0) lines[idx] = `SSH_KEY_PATH=${keyPath}`; else lines.push(`SSH_KEY_PATH=${keyPath}`);
      fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf-8");

      res.json({ success: true, keyPath, publicKey: pubKey, authorizedKeysPath: authKeys, autoInstalled, autoInstallError });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ---- GitHub ----
  // Resolve "owner/repo" from the actual git remote (origin), with GITHUB_REPO override.
  async function resolveGitHubRepo(execAsync: any): Promise<string> {
    const envOverride = (process.env.GITHUB_REPO || "").trim();
    if (envOverride.includes("/")) return envOverride;
    try {
      const { stdout } = await execAsync("git remote get-url origin", { timeout: 3001 });
      const m = (stdout || "").trim().match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (m) return `${m[1]}/${m[2]}`;
    } catch {}
    return "ivansslo/RocAgent";
  }

  app.get("/api/github/updates", async (req, res) => {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      const pat = process.env.GITHUB_PAT || process.env.GITHUB_OAUTH_TOKEN || process.env.GH_TOKEN || "";
      const repo = await resolveGitHubRepo(execAsync);

      let localHead = "";
      try { const { stdout } = await execAsync("git rev-parse HEAD", { timeout: 3001 }); localHead = stdout.trim(); } catch (_) {}

      const headers: any = { "User-Agent": "RocAgent-App", "Accept": "application/vnd.github.v3+json" };
      if (pat) headers["Authorization"] = `Bearer ${pat}`;

      let commits: any[] = [];
      let remoteHead = localHead ? localHead.substring(0, 7) : "0000000";
      let hasUpdates = false;
      try {
        const resp = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=5`, { headers });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data) && data.length > 0) {
            remoteHead = data[0].sha;
            hasUpdates = localHead !== remoteHead;
            commits = data.map((c: any) => ({ sha: c.sha.substring(0, 7), message: c.commit?.message || "", author: c.commit?.author?.name || c.author?.login || "", date: c.commit?.author?.date || new Date().toISOString(), url: c.html_url }));
          }
        }
      } catch (fetchErr) { console.warn("[GitHub API] Could not fetch commits:", fetchErr); }
      res.json({ hasUpdates, localHead: localHead ? localHead.substring(0, 7) : "0000000", remoteHead, repo, commits });
    } catch (err: any) {
      res.json({ hasUpdates: false, localHead: "0000000", remoteHead: "0000000", repo: "unknown", commits: [] });
    }
  });

  app.post("/api/github/pull", async (req, res) => {
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      const { stdout, stderr } = await execAsync("git pull origin main", { timeout: 30010 });
      try { dotenv.config({ override: true }); } catch (e) { console.warn("[dotenv] reload failed:", e); }
      res.json({ status: "success", stdout: stdout || "Pull successful", stderr: stderr || "" });
    } catch (err: any) { res.status(500).json({ status: "error", error: err.message }); }
  });

  app.post("/api/github/push", async (req, res) => {
    // Scrub EVERY token variant in output — not only the active one — so an
    // error message can never echo a different configured token.
    const tokensToScrub = [req.body?.token, process.env.GITHUB_PAT, process.env.GITHUB_OAUTH_TOKEN, process.env.GH_TOKEN].filter((t): t is string => typeof t === "string" && t.length > 0);
    const scrubAll = (t: string) => tokensToScrub.reduce((s, tok) => s.split(tok).join("***"), String(t || ""));
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      const token = req.body?.token || process.env.GITHUB_PAT || process.env.GITHUB_OAUTH_TOKEN || process.env.GH_TOKEN;
      if (!token) return res.status(400).json({ status: "error", error: "GitHub token diperlukan untuk push." });
      const repo = await resolveGitHubRepo(execAsync);
      let branch = "main";
      try { const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", { timeout: 3001 }); branch = stdout.trim() || "main"; } catch (_) {}
      await execAsync('git config user.name "RocAgent" && git config user.email "agent@rocagent.local"');
      await execAsync('git add . && git commit -m "chore: update via ROCAgents" || true');
      const pushUrl = `https://${token}@github.com/${repo}.git`;
      const { stdout, stderr } = await execAsync(`git push ${pushUrl} ${branch}`, { timeout: 45000 });
      res.json({ status: "success", message: `Push berhasil ke ${repo}:${branch}.`, stdout: scrubAll(stdout), stderr: scrubAll(stderr) });
    } catch (err: any) {
      res.status(500).json({ status: "error", error: scrubAll(String(err.message || "")) });
    }
  });

  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Serve pre-built static bundle if present, otherwise live Vite middleware
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(path.join(distPath, 'index.html')) && process.env.FORCE_DEV_VITE !== 'true') {
    console.log("📦 Serving pre-compiled static bundle from dist/...");
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // In Vercel serverless environment, DO NOT call app.listen() or Vite dev middleware
  if (!process.env.VERCEL) {
    if (!fs.existsSync(path.join(distPath, 'index.html')) || process.env.FORCE_DEV_VITE === 'true') {
      import("vite").then(({ createServer: createViteServer }) => {
        createViteServer({ server: { middlewareMode: true }, appType: "spa" }).then((vite) => {
          console.log("⚡ Serving live Vite development middleware...");
          app.use(vite.middlewares);
          app.listen(PORT, HOST, () => {
            console.log(`🚀 RocSystem Server running on http://${HOST}:${PORT} (auth: required)`);
          });
        });
      });
    } else {
      app.listen(PORT, HOST, () => {
        console.log(`🚀 RocSystem Server running on http://${HOST}:${PORT} (auth: required)`);
      });
    }
  }

// db.ts now debounces writes (see server/db.ts) instead of writing synchronously
// on every mutation. On shutdown, flush whatever's pending so nothing is lost.
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, flushing db before exit...`);
  try {
    await db.flushSync();
  } catch (err) {
    console.error("[shutdown] flush failed:", err);
  }
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
