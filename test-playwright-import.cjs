// Test: can we import playwright-core without it crashing?
const path = require('path');
console.log('Testing playwright-core import...');

try {
  // This is what happens when devTool is called
  const pw = require('playwright-core');
  console.log('✓ playwright-core loaded');
  console.log('  Version:', pw.chromium ? 'has chromium' : 'no chromium');
} catch (e) {
  console.log('✗ Failed to load:', e.message);
}