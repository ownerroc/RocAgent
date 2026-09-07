const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
const tools = db.tools || [];
console.log('Total tools:', tools.length);
console.log('\n=== Tools dengan nama terkait ===');
const related = tools.filter(t => 
  t.name && (
    t.name.includes('safety') || 
    t.name.includes('credential') || 
    t.name.includes('reversibility') ||
    t.name.includes('command') ||
    t.name.includes('check')
  )
);
console.log('Found:', related.length);
related.forEach(t => console.log('-', t.name, '|', (t.description || '').substring(0, 60)));