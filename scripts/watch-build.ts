#!/usr/bin/env node
/**
 * Watch build script - watches for file changes and runs build
 */
import { exec } from 'child_process';
import { watch } from 'fs';
import { resolve } from 'path';

// Debounce helper to avoid multiple rapid builds
const debounce = (fn: Function, delay: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

const runBuild = () => {
  console.log('🔧 Change detected, menjalankan "npm run build"...');
  exec('npm run build', (err, stdout, stderr) => {
    if (err) {
      console.error('❌ Build gagal:', err.message);
    } else {
      console.log(stdout);
      if (stderr) console.error(stderr);
      console.log('✅ Build selesai');
    }
  });
};

const debouncedBuild = debounce(runBuild, 600);

function watchRecursive(dir: string) {
  // Recursive watch (Node >= v10 supports this on many platforms, termasuk Termux Linux)
  watch(dir, { recursive: true }, (event, filename) => {
    if (!filename) return;
    // Ignore node_modules, dist, hidden files/folders
    if (filename.includes('node_modules') || filename.includes('dist') || filename.startsWith('.')) return;
    debouncedBuild();
  });
}

watchRecursive(resolve('.'));
console.log('👀 Watching for file changes...');