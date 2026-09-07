#!/usr/bin/env node

/**
 * SSH Orchestrator - Multi-Device SSH Command Execution
 * Usage: node ssh-orchestrator.js <command> [options]
 */

const fs = require('fs');
const path = require('path');
const { exec: execSync } = require('child_process');

const CONFIG_FILE = path.join(__dirname, 'config.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) {
    return { devices: [], groups: {}, defaults: { timeout: 30000, parallel: true, retry: 2 } };
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

const args = process.argv.slice(2);
const command = args[0];

const colors = { reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m' };

function log(color, msg) { console.log(color + msg + colors.reset); }
function success(msg) { log(colors.green, '✓ ' + msg); }
function error(msg) { log(colors.red, '✗ ' + msg); }
function info(msg) { log(colors.cyan, 'ℹ ' + msg); }
function warn(msg) { log(colors.yellow, '⚠ ' + msg); }

async function addDevice(alias, host, port, user, keyFile) {
  const config = loadConfig();
  if (config.devices.find(d => d.alias === alias)) {
    error('Device "' + alias + '" already exists');
    process.exit(1);
  }
  const device = { alias, host, port: port || 22, user, keyFile: keyFile || null, addedAt: new Date().toISOString() };
  config.devices.push(device);
  saveConfig(config);
  success('Device "' + alias + '" added: ' + user + '@' + host + ':' + port);
  info('Testing connection to ' + alias + '...');
  const result = await execSSH(device, 'echo "connection ok"');
  if (result.success) success('Connection to ' + alias + ' verified!');
  else warn('Could not verify connection: ' + result.error);
}

function removeDevice(alias) {
  const config = loadConfig();
  const index = config.devices.findIndex(d => d.alias === alias);
  if (index === -1) { error('Device "' + alias + '" not found'); process.exit(1); }
  config.devices.splice(index, 1);
  for (const groupName in config.groups) config.groups[groupName] = config.groups[groupName].filter(a => a !== alias);
  saveConfig(config);
  success('Device "' + alias + '" removed');
}

function listDevices() {
  const config = loadConfig();
  if (config.devices.length === 0) { info('No devices configured. Use: add <alias> <host> <port> <user> [key-file]'); return; }
  console.log('\n📱 Configured Devices:\n');
  console.log('  Alias     Host                  Port  User       Key File');
  console.log('  ' + '─'.repeat(70));
  for (const device of config.devices) {
    const key = device.keyFile ? path.basename(device.keyFile) : '-';
    console.log('  ' + device.alias.padEnd(9) + ' ' + device.host.padEnd(22) + ' ' + String(device.port).padEnd(5) + ' ' + device.user.padEnd(10) + ' ' + key);
  }
  console.log('');
}

function execSSH(device, command, timeout = 30000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let sshCmd = 'ssh -o ConnectTimeout=' + (timeout/1000) + ' -o StrictHostKeyChecking=no';
    if (device.port !== 22) sshCmd += ' -p ' + device.port;
    if (device.keyFile) sshCmd += ' -i "' + device.keyFile + '"';
    sshCmd += ' ' + device.user + '@' + device.host + ' "' + command + '"';
    execSync(sshCmd, { timeout, encoding: 'utf8' }, (err, stdout, stderr) => {
      const duration = Date.now() - startTime;
      if (err) resolve({ success: false, error: err.message, stderr, duration });
      else resolve({ success: true, stdout, stderr, duration });
    });
  });
}

async function execOnDevices(aliases, command) {
  const config = loadConfig();
  const devices = config.devices.filter(d => aliases.includes(d.alias));
  if (devices.length === 0) { error('No matching devices found'); process.exit(1); }
  console.log('\n🚀 Executing on ' + devices.length + ' device(s): ' + aliases.join(', ') + '\n');
  const results = [];
  for (const device of devices) {
    info('[' + device.alias + '] Running: ' + command);
    const result = await execSSH(device, command);
    results.push({ device: device.alias, ...result });
    if (result.success) console.log('\n📤 ' + device.alias + ' stdout:\n' + result.stdout);
    else console.log('\n📤 ' + device.alias + ' error: ' + result.error);
  }
  console.log('\n' + '─'.repeat(50));
  const successCount = results.filter(r => r.success).length;
  console.log('📊 Summary: ' + successCount + '/' + results.length + ' successful');
  return results;
}

async function pingDevices(aliases) {
  const config = loadConfig();
  let devices;
  if (aliases && aliases.length > 0) devices = config.devices.filter(d => aliases.includes(d.alias));
  else devices = config.devices;
  if (devices.length === 0) { error('No devices to ping'); process.exit(1); }
  console.log('\n🏓 Pinging ' + devices.length + ' device(s)...\n');
  const results = [];
  for (const device of devices) {
    const result = await execSSH(device, 'echo "pong"');
    results.push({ device: device.alias, ...result });
    if (result.success) success(device.alias + ': ✓ Online (' + result.duration + 'ms)');
    else error(device.alias + ': ✗ Offline - ' + result.error);
  }
  const online = results.filter(r => r.success).length;
  console.log('\n📊 Status: ' + online + '/' + results.length + ' online');
  return results;
}

function createGroup(groupName, aliases) {
  const config = loadConfig();
  const missing = aliases.filter(a => !config.devices.find(d => d.alias === a));
  if (missing.length > 0) { error('Unknown devices: ' + missing.join(', ')); process.exit(1); }
  config.groups[groupName] = aliases;
  saveConfig(config);
  success('Group "' + groupName + '" created with: ' + aliases.join(', '));
}

function listGroups() {
  const config = loadConfig();
  if (Object.keys(config.groups).length === 0) { info('No groups configured'); return; }
  console.log('\n📦 Device Groups:\n');
  for (const [name, aliases] of Object.entries(config.groups)) console.log('  ' + name + ': ' + aliases.join(', '));
  console.log('');
}

async function runGroup(groupName, command) {
  const config = loadConfig();
  const aliases = config.groups[groupName];
  if (!aliases) { error('Group "' + groupName + '" not found'); process.exit(1); }
  console.log('\n🎯 Running on group "' + groupName + '"...\n');
  return execOnDevices(aliases, command);
}

async function main() {
  switch (command) {
    case 'add':
      if (args.length < 4) { console.log('Usage: add <alias> <host> <port> <user> [key-file]'); process.exit(1); }
      await addDevice(args[1], args[2], args[3], args[4], args[5]); break;
    case 'remove': case 'rm':
      if (!args[1]) { console.log('Usage: remove <alias>'); process.exit(1); }
      removeDevice(args[1]); break;
    case 'list': case 'ls': listDevices(); break;
    case 'exec':
      if (args.length < 3) { console.log('Usage: exec <alias1,alias2,...> <command>'); process.exit(1); }
      await execOnDevices(args[1].split(','), args.slice(2).join(' ')); break;
    case 'all':
      if (!args[1]) { console.log('Usage: all <command>'); process.exit(1); }
      const config = loadConfig();
      const allAliases = config.devices.map(d => d.alias);
      if (allAliases.length === 0) { error('No devices configured'); process.exit(1); }
      await execOnDevices(allAliases, args.slice(1).join(' ')); break;
    case 'ping': await pingDevices(args[1] ? args[1].split(',') : null); break;
    case 'group':
      if (args.length < 3) { console.log('Usage: group <group-name> <alias1,alias2,...>'); process.exit(1); }
      createGroup(args[1], args[2].split(',')); break;
    case 'groups': listGroups(); break;
    case 'run-group':
      if (args.length < 3) { console.log('Usage: run-group <group-name> <command>'); process.exit(1); }
      await runGroup(args[1], args.slice(2).join(' ')); break;
    case 'help': default:
      console.log('\n🖥️  SSH Orchestrator - Multi-Device Command Execution\n');
      console.log('Usage: node ssh-orchestrator.js <command> [options]\n');
      console.log('Commands:');
      console.log('  add <alias> <host> <port> <user> [key-file]  - Add device');
      console.log('  remove <alias>                              - Remove device');
      console.log('  list                                        - List devices');
      console.log('  exec <aliases> <command>                    - Execute on devices');
      console.log('  all <command>                               - Execute on all');
      console.log('  ping [aliases]                              - Check connectivity');
      console.log('  group <name> <aliases>                      - Create group');
      console.log('  groups                                      - List groups');
      console.log('  run-group <name> <command>                  - Execute on group\n');
      console.log('Examples:');
      console.log('  node ssh-orchestrator.js add web1 192.168.1.10 22 root ~/.ssh/id_rsa');
      console.log('  node ssh-orchestrator.js exec web1,web2 "df -h"');
      console.log('  node ssh-orchestrator.js all "uptime"');
      console.log('  node ssh-orchestrator.js group prod web1,web2,web3');
      console.log('  node ssh-orchestrator.js run-group prod "systemctl restart nginx"\n');
      break;
  }
}

main().catch(err => { error(err.message); process.exit(1); });