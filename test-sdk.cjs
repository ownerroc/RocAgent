// Test old scaleway SDK
const scaleway = require('scaleway');

console.log('scaleway:', scaleway);
console.log('type:', typeof scaleway);

// Try creating client
const client = scaleway({
  token: process.env.SCALEWAY_TOKEN || 'test'
});

console.log('client:', client);
console.log('client methods:', Object.keys(client));