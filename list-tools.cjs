const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
const tools = db.tools || [];
console.log('=== All Registered Tools ===');
tools.forEach((t, i) => {
  console.log(`${i+1}. ${t.name}`);
  console.log(`   Desc: ${(t.description || '').substring(0, 60)}`);
});