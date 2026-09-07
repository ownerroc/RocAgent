#!/usr/bin/env node
import fs from 'fs';
const db = JSON.parse(fs.readFileSync('./db.json', 'utf8'));
console.log('Tools:', db.tools?.length || 0);
console.log('Logs:', db.logs?.length || 0);
console.log('Sessions:', db.sessions?.length || 0);
console.log('Memories:', db.memories?.length || 0);
if (db.logs && db.logs.length > 0) {
  console.log('\nSample log entry:');
  console.log(JSON.stringify(db.logs[0], null, 2));
}