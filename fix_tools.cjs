const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');
const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

console.log('Before:', data.tools.length);

// Filter out tools with empty name
const originalLength = data.tools.length;
data.tools = data.tools.filter(t => t.name && t.name.trim() !== '');

console.log('After:', data.tools.length);
console.log('Removed:', originalLength - data.tools.length);

// Save
fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
console.log('Saved!');