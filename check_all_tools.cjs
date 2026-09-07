const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');
const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const tools = data.tools || [];

console.log('Total tools:', tools.length);
console.log('\n=== ALL tools with potential issues ===\n');

let issues = [];

for (let i = 0; i < tools.length; i++) {
  const t = tools[i];
  let issue = null;
  
  // Check name
  if (!t.name || t.name.trim() === '') {
    issue = `EMPTY name`;
  } else if (!/^[a-zA-Z0-9_-]+$/.test(t.name)) {
    issue = `Invalid name: "${t.name}"`;
  }
  
  // Check description
  if (!t.description || t.description.trim() === '') {
    issue = (issue ? issue + ', ' : '') + `EMPTY description`;
  }
  
  if (issue) {
    console.log(`[${i}] ${issue}`);
    console.log(`    full tool:`, JSON.stringify(t).substring(0, 200));
    issues.push({ index: i, tool: t, issue });
  }
}

console.log('\n=== Summary ===');
console.log('Total issues:', issues.length);
if (issues.length > 0) {
  console.log('\nProblematic tools:');
  issues.forEach(x => console.log(`- ${x.tool.name || '(empty)'}: ${x.issue}`));
}