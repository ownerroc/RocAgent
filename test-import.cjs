// Test imports
const fs = require('fs');

console.log('=== Testing File Existence ===');
console.log('command-safety.ts:', fs.existsSync('./server/command-safety.ts') ? 'EXISTS' : 'MISSING');
console.log('credential-policy.ts:', fs.existsSync('./server/credential-policy.ts') ? 'EXISTS' : 'MISSING');
console.log('action-reversibility.ts:', fs.existsSync('./server/action-reversibility.ts') ? 'EXISTS' : 'MISSING');

console.log('\n=== File Sizes ===');
const cs = fs.statSync('./server/command-safety.ts');
const cp = fs.statSync('./server/credential-policy.ts');
const ar = fs.statSync('./server/action-reversibility.ts');
console.log('command-safety.ts:', cs.size, 'bytes');
console.log('credential-policy.ts:', cp.size, 'bytes');
console.log('action-reversibility.ts:', ar.size, 'bytes');

console.log('\n=== Syntax Check (Basic) ===');
try {
  const csContent = fs.readFileSync('./server/command-safety.ts', 'utf8');
  // Check for common syntax issues
  const openBrace = (csContent.match(/{/g) || []).length;
  const closeBrace = (csContent.match(/}/g) || []).length;
  const openParen = (csContent.match(/\(/g) || []).length;
  const closeParen = (csContent.match(/\)/g) || []).length;
  console.log('command-safety.ts: braces', openBrace === closeBrace ? 'OK' : 'MISMATCH', openBrace, '/', closeBrace);
  console.log('command-safety.ts: parens', openParen === closeParen ? 'OK' : 'MISMATCH', openParen, '/', closeParen);
} catch(e) {
  console.log('Error:', e.message);
}