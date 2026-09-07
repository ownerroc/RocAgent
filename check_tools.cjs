const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

function sanitizeSchema(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeSchema);
  
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'type' && typeof v === 'string') {
      res[k] = v.toLowerCase();
    } else {
      res[k] = sanitizeSchema(v);
    }
  }
  return res;
}

const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const tools = data.tools || [];

console.log('Total tools:', tools.length);
console.log('\n=== Checking first 10 tools for issues ===\n');

let issues = [];

for (let i = 0; i < Math.min(10, tools.length); i++) {
  const t = tools[i];
  console.log(`[${i}] name: "${t.name}"`);
  console.log(`    desc: "${(t.description || '').substring(0, 50)}..."`);
  console.log(`    params: ${JSON.stringify(t.parameters?.properties || {}).substring(0, 100)}`);
  
  // Check for issues
  if (!t.name || t.name.trim() === '') {
    issues.push(`Tool ${i}: EMPTY name`);
  }
  if (!t.description || t.description.trim() === '') {
    issues.push(`Tool ${i}: EMPTY description`);
  }
  if (t.name && !/^[a-zA-Z0-9_-]+$/.test(t.name)) {
    issues.push(`Tool ${i}: Invalid name format "${t.name}"`);
  }
  console.log('');
}

console.log('=== ISSUES FOUND ===');
if (issues.length === 0) {
  console.log('None!');
} else {
  issues.forEach(x => console.log(x));
}