const fs = require('fs');
const d = JSON.parse(fs.readFileSync('db.json', 'utf8'));

console.log('=== DB.JSON ANALYSIS ===\n');

// Check for duplicates in logs
const logIds = d.logs.map(l => l.timestamp + '_' + l.toolName);
const uniqueLogIds = new Set(logIds);
console.log('Logs:', d.logs.length, '| Unique:', uniqueLogIds.size, '| Duplicates:', d.logs.length - uniqueLogIds.size);

// Check for broken/null entries
const nullLogs = d.logs.filter(l => !l.timestamp || !l.toolName);
const nullSessions = d.chatSessions.filter(s => !s.id || !s.createdAt);
console.log('Broken logs:', nullLogs.length);
console.log('Broken sessions:', nullSessions.length);

// Check tools
console.log('\n=== TOOLS ===');
console.log('Total tools:', d.tools.length);
const toolNames = d.tools.map(t => t.name || t);
console.log('Sample tools:', toolNames.slice(0, 10).join(', '));

// Check sessions
console.log('\n=== SESSIONS ===');
d.chatSessions.forEach(s => {
  console.log(`- ${s.id}: ${s.title} (${s.messages?.length || 0} messages)`);
});