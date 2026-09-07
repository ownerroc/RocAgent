// Direct test for RocSystem_* tools
import { toolImplementations } from './server/tools.ts';

console.log('=== Testing RocSystem_* Tools ===\n');

const tests = [
  { name: 'RocSystem_npm', fn: () => toolImplementations.RocSystem_npm({ command: '--version' }) },
  { name: 'RocSystem_node', fn: () => toolImplementations.RocSystem_node({ script: 'package.json' }) },
  { name: 'RocSystem_python', fn: () => toolImplementations.RocSystem_python({ script: 'test_decrypt.js' }) },
  { name: 'RocSystem_docker', fn: () => toolImplementations.RocSystem_docker({ command: 'ps' }) },
  { name: 'RocSystem_fileOps copy', fn: () => toolImplementations.RocSystem_fileOps.copy({ from: 'package.json', to: 'test_copy.json' }) },
  { name: 'RocSystem_fileOps move', fn: () => toolImplementations.RocSystem_fileOps.move({ from: 'test_copy.json', to: 'test_move.json' }) },
  { name: 'RocSystem_fileOps rename', fn: () => toolImplementations.RocSystem_fileOps.rename({ from: 'test_move.json', to: 'test_rename.json' }) },
];

for (const test of tests) {
  try {
    console.log(`Testing ${test.name}...`);
    const result = await test.fn();
    console.log(`  ✓ SUCCESS:`, JSON.stringify(result).substring(0, 150));
  } catch (e) {
    console.log(`  ✗ ERROR: ${e.message}`);
  }
  console.log('');
}

// Cleanup
import fs from 'fs';
['test_copy.json', 'test_move.json', 'test_rename.json'].forEach(f => {
  if (fs.existsSync(f)) fs.unlinkSync(f);
});
console.log('Cleanup done.');