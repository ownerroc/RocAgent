#!/usr/bin/env node
/**
 * Backup Patch Generator for RocEnv
 * Creates .patch files for: functions, tools, modular, sessions, memory, owner rights
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { createHash } from 'crypto';

const BACKUP_DIR = 'backup/patch';
const TIMESTAMP = Date.now();

// Ensure backup directory exists
mkdirSync(BACKUP_DIR, { recursive: true });

function getFiles(dir, extensions = []) {
  const files = [];
  if (!existsSync(dir)) return files;
  
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...getFiles(fullPath, extensions));
    } else if (stat.isFile()) {
      if (extensions.length === 0 || extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function createPatchContent(filePath, content) {
  const hash = createHash('sha256').update(content).digest('hex').substring(0, 8);
  return {
    file: filePath,
    hash,
    size: content.length,
    content
  };
}

// 1. FUNCTIONS - server/*.ts (core agent functions)
console.log('📦 Creating patch: functions...');
const serverFiles = getFiles('server', ['.ts']).filter(f => !f.includes('__tests__'));
const functionsPatch = {
  type: 'functions',
  timestamp: TIMESTAMP,
  files: serverFiles.map(f => {
    const content = readFileSync(f, 'utf-8');
    return createPatchContent(relative('.', f), content);
  })
};
writeFileSync(join(BACKUP_DIR, `functions-${TIMESTAMP}.patch`), JSON.stringify(functionsPatch, null, 2));
console.log(`   ✅ ${serverFiles.length} files`);

// 2. TOOLS - tools/* (external tools)
console.log('📦 Creating patch: tools...');
const toolsFiles = getFiles('tools').filter(f => !f.includes('__tests__'));
const toolsPatch = {
  type: 'tools',
  timestamp: TIMESTAMP,
  files: toolsFiles.map(f => {
    const content = readFileSync(f, 'utf-8');
    return createPatchContent(relative('.', f), content);
  })
};
writeFileSync(join(BACKUP_DIR, `tools-${TIMESTAMP}.patch`), JSON.stringify(toolsPatch, null, 2));
console.log(`   ✅ ${toolsFiles.length} files`);

// 3. MODULAR - server/utils/* (modular utilities)
console.log('📦 Creating patch: modular...');
const utilsFiles = getFiles('server/utils', ['.ts']);
const modularPatch = {
  type: 'modular',
  timestamp: TIMESTAMP,
  files: utilsFiles.map(f => {
    const content = readFileSync(f, 'utf-8');
    return createPatchContent(relative('.', f), content);
  })
};
writeFileSync(join(BACKUP_DIR, `modular-${TIMESTAMP}.patch`), JSON.stringify(modularPatch, null, 2));
console.log(`   ✅ ${utilsFiles.length} files`);

// 4. SESSIONS - sessions/* (conversation sessions)
console.log('📦 Creating patch: sessions...');
const sessionsFiles = getFiles('sessions', ['.json']);
const sessionsPatch = {
  type: 'sessions',
  timestamp: TIMESTAMP,
  files: sessionsFiles.map(f => {
    const content = readFileSync(f, 'utf-8');
    return createPatchContent(relative('.', f), content);
  })
};
writeFileSync(join(BACKUP_DIR, `sessions-${TIMESTAMP}.patch`), JSON.stringify(sessionsPatch, null, 2));
console.log(`   ✅ ${sessionsFiles.length} files`);

// 5. MEMORY - db.json (agent memory/knowledge base)
console.log('📦 Creating patch: memory...');
if (existsSync('db.json')) {
  const dbContent = readFileSync('db.json', 'utf-8');
  const memoryPatch = {
    type: 'memory',
    timestamp: TIMESTAMP,
    file: 'db.json',
    hash: createHash('sha256').update(dbContent).digest('hex').substring(0, 8),
    size: dbContent.length,
    content: dbContent
  };
  writeFileSync(join(BACKUP_DIR, `memory-${TIMESTAMP}.patch`), JSON.stringify(memoryPatch, null, 2));
  console.log(`   ✅ db.json (${Math.round(dbContent.length / 1024)}KB)`);
} else {
  console.log('   ⚠️  db.json not found, skipping');
}

// 6. OWNER RIGHTS - hak owner terhadap agent
console.log('📦 Creating patch: owner-rights...');
const ownerFiles = ['server/users.ts', 'server/authMiddleware.ts', 'server/workspaces.ts'];
const ownerPatch = {
  type: 'owner-rights',
  timestamp: TIMESTAMP,
  files: ownerFiles.filter(f => existsSync(f)).map(f => {
    const content = readFileSync(f, 'utf-8');
    return createPatchContent(f, content);
  })
};
writeFileSync(join(BACKUP_DIR, `owner-rights-${TIMESTAMP}.patch`), JSON.stringify(ownerPatch, null, 2));
console.log(`   ✅ ${ownerPatch.files.length} files`);

// Summary
console.log('\n✅ Backup Complete!');
console.log(`📁 Location: ${BACKUP_DIR}/`);
console.log(`📅 Timestamp: ${TIMESTAMP}`);
console.log('\nPatch files created:');
console.log('  - functions-<timestamp>.patch');
console.log('  - tools-<timestamp>.patch');
console.log('  - modular-<timestamp>.patch');
console.log('  - sessions-<timestamp>.patch');
console.log('  - memory-<timestamp>.patch');
console.log('  - owner-rights-<timestamp>.patch');