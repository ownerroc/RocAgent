const fs = require('fs');
const d = JSON.parse(fs.readFileSync('db.json', 'utf8'));
console.log('Top-level keys:', Object.keys(d).join(', '));
console.log('chatSessions count:', d.chatSessions?.length || 0);
console.log('logs count:', d.logs?.length || 0);
console.log('tools count:', d.tools?.length || 0);