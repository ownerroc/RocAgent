import { toolImplementations } from './server/tools.js';

console.log('=== Testing RocSystem_* Tools ===\n');

const tests = [
  { name: 'RocSystem_listFile', fn: () => toolImplementations.RocSystem_listFile() },
  { name: 'RocSystem_navigate', fn: () => toolImplementations.RocSystem_navigate({ path: '/data/data/com.termux/files/home' }) },
  { name: 'RocSystem_exec', fn: () => toolImplementations.RocSystem_exec({ command: 'echo "hello from RocSystem_exec"' }) },
  { name: 'RocSystem_terminal', fn: () => toolImplementations.RocSystem_terminal({ command: 'echo "hello from RocSystem_terminal"' }) },
  { name: 'RocSystem_memory', fn: () => toolImplementations.RocSystem_memory({ action: 'list' }) },
];

for (const test of tests) {
  try {
    console.log(`Testing ${test.name}...`);
    const result = await test.fn();
    console.log(`  ✓ SUCCESS:`, JSON.stringify(result).substring(0, 100));
  } catch (e) {
    console.log(`  ✗ ERROR: ${e.message}`);
  }
  console.log('');
}