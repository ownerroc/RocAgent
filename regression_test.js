// Simple regression test for RocSystem workspace
const fs = require('fs');
const assert = require('assert');

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

// 1. package.json name should be "RocSystem"
const pkg = readJSON('package.json');
assert.strictEqual(pkg.name, 'RocSystem', 'package.json name mismatch');

// 2. index.html title should contain "RocSystem"
const indexContent = fs.readFileSync('index.html', 'utf8');
assert.ok(/<title>.*RocSystem.*<\/title>/i.test(indexContent), 'index.html title missing RocSystem');

// 3. workspaces.json should have correct name "rocsystem"
const ws = readJSON('workspaces.json');
assert.strictEqual(ws.name, 'rocsystem', 'workspaces.json name typo');

// 4. db.json should not contain plaintext passwords (simple heuristic)
const dbRaw = fs.readFileSync('db.json', 'utf8');
assert.ok(!/password\s*[:=]\s*"[^"]{8,}"/i.test(dbRaw), 'db.json contains plaintext password');

console.log('All regression checks passed.');
