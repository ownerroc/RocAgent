/**
 * QA Regression Test Suite: Gitignore & Sensitive Files Update
 * Tests the .gitignore update, sensitive files structure, license, and docs.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const RESULTS = [];

function test(name, fn) {
  try {
    const result = fn();
    RESULTS.push({ name, passed: result, error: null });
    console.log(`${result ? '✓' : '✗'} ${name}`);
  } catch (e) {
    RESULTS.push({ name, passed: false, error: e.message });
    console.log(`✗ ${name}: ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ===== TEST SUITE =====

// 1. .gitignore contains sensitive folders
test('.gitignore includes sensitive/', () => {
  const content = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  return content.includes('sensitive/');
});

test('.gitignore includes sensitive/credentials/', () => {
  const content = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  return content.includes('sensitive/credentials/');
});

test('.gitignore includes sensitive/keys/', () => {
  const content = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  return content.includes('sensitive/keys/');
});

test('.gitignore includes licenses/', () => {
  const content = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  return content.includes('licenses/');
});

test('.gitignore includes docs/', () => {
  const content = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  return content.includes('docs/');
});

// 2. Sensitive directories exist
test('sensitive/ directory exists', () => {
  return fs.existsSync(path.join(ROOT, 'sensitive'));
});

test('sensitive/credentials/ directory exists', () => {
  return fs.existsSync(path.join(ROOT, 'sensitive', 'credentials'));
});

test('sensitive/keys/ directory exists', () => {
  return fs.existsSync(path.join(ROOT, 'sensitive', 'keys'));
});

// 3. licenses/ directory and file
test('licenses/ directory exists', () => {
  return fs.existsSync(path.join(ROOT, 'licenses'));
});

test('ROCENV_PROPRIETARY_LICENSE.txt exists', () => {
  return fs.existsSync(path.join(ROOT, 'licenses', 'ROCENV_PROPRIETARY_LICENSE.txt'));
});

test('License file contains copyright notice', () => {
  const content = fs.readFileSync(path.join(ROOT, 'licenses', 'ROCENV_PROPRIETARY_LICENSE.txt'), 'utf8');
  return content.includes('Copyright') && content.includes('Ivan Ssl');
});

// 4. docs/ directory and SENSITIVE_FILES_GUIDE.md
test('docs/ directory exists', () => {
  return fs.existsSync(path.join(ROOT, 'docs'));
});

test('SENSITIVE_FILES_GUIDE.md exists', () => {
  return fs.existsSync(path.join(ROOT, 'docs', 'SENSITIVE_FILES_GUIDE.md'));
});

test('SENSITIVE_FILES_GUIDE.md contains credentials section', () => {
  const content = fs.readFileSync(path.join(ROOT, 'docs', 'SENSITIVE_FILES_GUIDE.md'), 'utf8');
  return content.includes('credentials');
});

test('SENSITIVE_FILES_GUIDE.md contains keys section', () => {
  const content = fs.readFileSync(path.join(ROOT, 'docs', 'SENSITIVE_FILES_GUIDE.md'), 'utf8');
  return content.includes('keys');
});

// 5. README.md updated
test('README.md mentions sensitive/', () => {
  const content = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  return content.includes('sensitive/');
});

test('README.md mentions licenses/', () => {
  const content = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  return content.includes('licenses/');
});

test('README.md mentions docs/', () => {
  const content = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  return content.includes('docs/');
});

// 6. Security measures in README
test('README.md mentions vault encryption', () => {
  const content = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  return content.includes('vault') || content.includes('encrypted');
});

// ===== SUMMARY =====
const passed = RESULTS.filter(r => r.passed).length;
const total = RESULTS.length;
const coverage = Math.round((passed / total) * 100);

console.log('\n--- TEST SUMMARY ---');
console.log(`Passed: ${passed}/${total}`);
console.log(`Coverage: ${coverage}%`);

if (coverage < 100) {
  console.log('\nFailed tests:');
  RESULTS.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
}

process.exit(coverage === 100 ? 0 : 1);