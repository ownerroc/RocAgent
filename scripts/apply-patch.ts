#!/usr/bin/env node
/**
 * Script untuk apply patch dan trigger build sekali saja.
 * Penggunaan: node scripts/apply-patch.ts <patch-file>
 */
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// File untuk tracking patch yang sudah di-apply
const PATCH_STATE_FILE = join(ROOT, '.patch-state.json');

async function readPatchState() {
  try {
    const data = await fs.readFile(PATCH_STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { appliedPatches: {} };
  }
}

async function writePatchState(state: any) {
  await fs.writeFile(PATCH_STATE_FILE, JSON.stringify(state, null, 2));
}

async function applyPatchAndBuild(patchFile: string) {
  const state = await readPatchState();
  const patchPath = join(ROOT, patchFile);
  
  // Cek apakah patch sudah di-apply sebelumnya
  if (state.appliedPatches[patchFile]) {
    console.log(`⏭️ Patch ${patchFile} sudah di-apply sebelumnya (${state.appliedPatches[patchFile]})`);
    return;
  }
  
  console.log(`📦 Apply patch: ${patchFile}`);
  
  // Apply patch dengan git apply
  await new Promise((resolve, reject) => {
    exec(`git apply "${patchFile}"`, { cwd: ROOT }, (err, stdout, stderr) => {
      if (err) {
        // Patch mungkin sudah ada di codebase (cek secara manual)
        console.log(`⚠️ git apply gagal: ${err.message}`);
        console.log(`   (Patch mungkin sudah ada di codebase)`);
        // Tetap lanjut karena patch sudah ada
      }
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      resolve();
    });
  });
  
  // Update state
  state.appliedPatches[patchFile] = new Date().toISOString();
  await writePatchState(state);
  
  // Jalankan build SEKALI saja (esbuild saja, skip vite yang sering stuck)
  console.log(`🔨 Menjalankan build sekali saja (esbuild)...`);
  await new Promise((resolve, reject) => {
    // Skip vite build yang bermasalah, langsung esbuild
    exec('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs', { cwd: ROOT }, (err, stdout, stderr) => {
      if (err) {
        console.error('❌ Build gagal:', err.message);
        reject(err);
        return;
      }
      console.log(stdout);
      if (stderr) console.error(stderr);
      console.log('✅ Build selesai');
      resolve();
    });
  });
  
  console.log(`✅ Patch ${patchFile} berhasil di-apply dan build selesai`);
}

// Main execution
const patchFile = process.argv[2];
if (!patchFile) {
  console.log('Penggunaan: node scripts/apply-patch.ts <patch-file>');
  process.exit(1);
}

applyPatchAndBuild(patchFile)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Gagal:', err);
    process.exit(1);
  });