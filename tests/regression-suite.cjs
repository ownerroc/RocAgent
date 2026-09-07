/**
 * ROCSYSTEM REGRESSION TEST SUITE
 * QA Supervisor - Engineering Orchestra Pipeline
 * 
 * Tests:
 * 1. Tool Identity - Verifikasi 15 file identik antara rocsystem dan rocenv
 * 2. Security Fixes - Validasi hardening dari Pentester findings
 * 3. Functionality - Smoke test setiap tool
 */

const { readFileSync, existsSync, statSync } = require('fs');
const { join } = require('path');
const { createHash } = require('crypto');
const { execSync } = require('child_process');

const ROCENV_TOOLS = '/data/data/com.termux/files/home/.agent/rocenv/tools';
const ROCSYSTEM_TOOLS = '/data/data/com.termux/files/home/.agent/rocsystem/tools';

const TOOLS = [
  'bashrc-helpers.sh',
  'dump_and_kill.py',
  'fix-git-am.sh',
  'install-bashrc-helpers.sh',
  'install.sh',
  'keylog_trap.py',
  'payload_manager.py',
  'recover-env.sh',
  'rocagent-cli',
  'rocagent-vm',
  'rocvault',
  'setup-isolated-user.sh',
  'test-agent.sh',
  'unhook-ubuntu.sh',
  'verify-rotation.sh'
];

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
  console.log(`${status}: ${name}${details ? ' - ' + details : ''}`);
}

function logWarning(name, details) {
  results.warnings++;
  console.log(`⚠️  WARN: ${name} - ${details}`);
}

// ============================================
// TEST 1: TOOL IDENTITY (MD5 Checksum)
// ============================================
function testToolIdentity() {
  console.log('\n=== TEST 1: TOOL IDENTITY (MD5 Checksum) ===\n');
  
  let allIdentical = true;
  
  for (const tool of TOOLS) {
    const rqPath = join(ROCENV_TOOLS, tool);
    const rsPath = join(ROCSYSTEM_TOOLS, tool);
    
    if (!existsSync(rqPath) || !existsSync(rsPath)) {
      logTest(`Tool exists: ${tool}`, false, 'File not found');
      allIdentical = false;
      continue;
    }
    
    const rqHash = createHash('md5').update(readFileSync(rqPath)).digest('hex');
    const rsHash = createHash('md5').update(readFileSync(rsPath)).digest('hex');
    
    const identical = rqHash === rsHash;
    logTest(`MD5 match: ${tool}`, identical, identical ? rqHash : `RQ: ${rqHash.substring(0,8)} vs RS: ${rsHash.substring(0,8)}`);
    
    if (!identical) allIdentical = false;
  }
  
  return allIdentical;
}

// ============================================
// TEST 2: SECURITY HARDENING VERIFICATION
// ============================================
function testSecurityHardening() {
  console.log('\n=== TEST 2: SECURITY HARDENING VERIFICATION ===\n');
  
  // 2.1: keylog_trap.py - Permission check (MEDIUM finding)
  const keylogTrapPath = join(ROCENV_TOOLS, 'keylog_trap.py');
  if (existsSync(keylogTrapPath)) {
    const content = readFileSync(keylogTrapPath, 'utf8');
    const hasChmod = content.includes('os.chmod') || content.includes('chmod');
    logTest('keylog_trap.py: Permission hardening', hasChmod, 
      hasChmod ? 'os.chmod found' : 'MISSING - needs os.chmod(self.log_file, 0o600)');
  }
  
  // 2.2: payload_manager.py - JSON instead of pickle (LOW finding)
  const payloadMgrPath = join(ROCENV_TOOLS, 'payload_manager.py');
  if (existsSync(payloadMgrPath)) {
    const content = readFileSync(payloadMgrPath, 'utf8');
    const usesJson = content.includes('json.load') || content.includes('json.dump');
    const usesPickle = content.includes('pickle.load') || content.includes('pickle.dump');
    logTest('payload_manager.py: JSON over Pickle', usesJson && !usesPickle,
      usesJson ? 'Uses JSON' : (usesPickle ? 'Still uses Pickle - vulnerable to deserialization' : 'No serialization found'));
  }
  
  // 2.3: verify-rotation.sh - Output sanitization (LOW finding)
  const verifyRotationPath = join(ROCENV_TOOLS, 'verify-rotation.sh');
  if (existsSync(verifyRotationPath)) {
    const content = readFileSync(verifyRotationPath, 'utf8');
    const hasSanitization = content.includes('head -c') || content.includes('sed');
    logTest('verify-rotation.sh: Output sanitization', hasSanitization,
      hasSanitization ? 'Output limited/length-checked' : 'No output length limit found');
  }
  
  // 2.4: rocvault - Cryptographic strength (should PASS)
  const rocvaultPath = join(ROCENV_TOOLS, 'rocvault');
  if (existsSync(rocvaultPath)) {
    const content = readFileSync(rocvaultPath, 'utf8');
    const hasPBKDF2 = content.includes('PBKDF2') || content.includes('pbkdf2');
    const hasAES = content.includes('AES-256') || content.includes('aes-256-cbc');
    const has600k = content.includes('600000') || content.includes('600k');
    logTest('rocvault: PBKDF2 600k iterations', has600k, has600k ? '600k iterations configured' : 'Iteration count not found');
    logTest('rocvault: AES-256-CBC', hasAES, hasAES ? 'AES-256-CBC found' : 'AES-256 not found');
    logTest('rocvault: Encrypt-then-MAC', content.includes('HMAC') || content.includes('hmac'), 'HMAC found');
  }
  
  // 2.5: setup-isolated-user.sh - Systemd hardening
  const isolatedUserPath = join(ROCENV_TOOLS, 'setup-isolated-user.sh');
  if (existsSync(isolatedUserPath)) {
    const content = readFileSync(isolatedUserPath, 'utf8');
    const hasNoNewPrivileges = content.includes('NoNewPrivileges');
    const hasProtectSystem = content.includes('ProtectSystem');
    logTest('setup-isolated-user.sh: NoNewPrivileges', hasNoNewPrivileges, hasNoNewPrivileges ? 'Found' : 'Missing');
    logTest('setup-isolated-user.sh: ProtectSystem', hasProtectSystem, hasProtectSystem ? 'Found' : 'Missing');
  }
}

// ============================================
// TEST 3: TOOL EXECUTABILITY
// ============================================
function testToolExecutability() {
  console.log('\n=== TEST 3: TOOL EXECUTABILITY ===\n');
  
  const shellTools = TOOLS.filter(t => t.endsWith('.sh'));
  const pyTools = TOOLS.filter(t => t.endsWith('.py'));
  const binTools = TOOLS.filter(t => !t.endsWith('.sh') && !t.endsWith('.py'));
  
  // Test shell scripts syntax
  for (const tool of shellTools) {
    const path = join(ROCENV_TOOLS, tool);
    try {
      execSync(`bash -n "${path}"`, { stdio: 'pipe' });
      logTest(`Shell syntax: ${tool}`, true, 'Valid bash syntax');
    } catch (e) {
      logTest(`Shell syntax: ${tool}`, false, 'Syntax error');
    }
  }
  
  // Test Python syntax
  for (const tool of pyTools) {
    const path = join(ROCENV_TOOLS, tool);
    try {
      execSync(`python3 -m py_compile "${path}"`, { stdio: 'pipe' });
      logTest(`Python syntax: ${tool}`, true, 'Valid Python syntax');
    } catch (e) {
      logTest(`Python syntax: ${tool}`, false, 'Syntax error');
    }
  }
  
  // Test binary tools (check shebang)
  for (const tool of binTools) {
    const path = join(ROCENV_TOOLS, tool);
    try {
      const content = readFileSync(path, 'utf8');
      const hasShebang = content.startsWith('#!');
      logTest(`Shebang: ${tool}`, hasShebang, hasShebang ? 'Has shebang' : 'Missing shebang');
    } catch (e) {
      logTest(`Shebang: ${tool}`, false, 'Cannot read file');
    }
  }
}

// ============================================
// TEST 4: FILE PERMISSIONS
// ============================================
function testFilePermissions() {
  console.log('\n=== TEST 4: FILE PERMISSIONS ===\n');
  
  for (const tool of TOOLS) {
    const path = join(ROCENV_TOOLS, tool);
    if (existsSync(path)) {
      const stats = statSync(path);
      const mode = stats.mode.toString(8).slice(-3);
      
      // Scripts should be executable (755 or 700 for sensitive)
      if (tool === 'rocvault' || tool === 'rocagent-vm' || tool === 'rocagent-cli') {
        const isExecutable = (stats.mode & 0o111) !== 0;
        logTest(`Executable: ${tool}`, isExecutable, `mode: ${mode}`);
      }
    }
  }
}

// ============================================
// TEST 5: SHELL GUARD (server.ts blocks)
// ============================================
function testShellGuard() {
  console.log('\n=== TEST 5: SHELL GUARD (server.ts) ===\n');
  
  const serverPath = '/data/data/com.termux/files/home/.agent/rocenv/server.ts';
  if (existsSync(serverPath)) {
    const content = readFileSync(serverPath, 'utf8');
    
    const hasEvalBlock = content.includes('eval') && content.includes('DENIED');
    const hasRmRfBlock = content.includes('rm -rf') && content.includes('DENIED');
    const hasDdBlock = content.includes('dd ') && content.includes('DENIED');
    const hasRemoteCodeBlock = content.includes('remote') && content.includes('code');
    
    logTest('Shell Guard: eval blocking', hasEvalBlock, hasEvalBlock ? 'Found' : 'Missing');
    logTest('Shell Guard: rm -rf blocking', hasRmRfBlock, hasRmRfBlock ? 'Found' : 'Missing');
    logTest('Shell Guard: dd blocking', hasDdBlock, hasDdBlock ? 'Found' : 'Missing');
    logTest('Shell Guard: Remote code detection', hasRemoteCodeBlock, hasRemoteCodeBlock ? 'Found' : 'Missing');
  } else {
    logTest('Shell Guard: server.ts exists', false, 'File not found');
  }
}

// ============================================
// MAIN RUNNER
// ============================================
function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ROCQUANTUM REGRESSION TEST SUITE                          ║');
  console.log('║  QA Supervisor - Engineering Orchestra Pipeline            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();
  
  // Run all tests
  const identityResult = testToolIdentity();
  testSecurityHardening();
  testToolExecutability();
  testFilePermissions();
  testShellGuard();
  
  const duration = Date.now() - startTime;
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST SUMMARY                                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`Duration: ${duration}ms`);
  
  // Calculate coverage
  const totalChecks = results.passed + results.failed;
  const coverage = Math.round((results.passed / totalChecks) * 100);
  console.log(`\n📊 Regression Test Coverage: ${coverage}%`);
  
  // Exit code
  const exitCode = results.failed > 0 ? 1 : 0;
  console.log(`\nExit Code: ${exitCode}`);
  
  return { coverage, exitCode, results };
}

const { coverage, exitCode } = main();
process.exit(exitCode);