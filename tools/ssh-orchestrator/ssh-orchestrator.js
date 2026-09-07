/**
 * SSH Orchestrator - Multi-device SSH execution tool
 * Version: 1.0.0
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment
const envPath = path.join(__dirname, '../../.env');
let envConfig = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envConfig[match[1].trim()] = match[2].trim();
    }
  });
}

// Default config
const config = {
  sshHost: envConfig.SSH_HOST || 'localhost',
  sshUser: envConfig.SSH_USER || 'u0_a236',
  sshPort: envConfig.SSH_PORT?.split(',')[1]?.trim() || '8022',
  sshPassword: envConfig.SSH_PASSWORD || '',
  sshKeyPath: envConfig.SSH_KEY_PATH || '',
};

function sshExec(command, hostConfig = null) {
  return new Promise((resolve, reject) => {
    const target = hostConfig || config;
    const args = [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-p', target.sshPort,
    ];
    
    if (target.sshKeyPath && fs.existsSync(target.sshKeyPath)) {
      args.push('-i', target.sshKeyPath);
    }
    
    args.push(`${target.sshUser}@${target.sshHost}`);
    args.push(command);
    
    let sshCmd, cmdArgs;
    if (target.sshPassword) {
      sshCmd = 'sshpass';
      cmdArgs = ['-p', target.sshPassword, 'ssh', ...args];
    } else {
      sshCmd = 'ssh';
      cmdArgs = args;
    }
    
    console.log(`[SSH] Running: ${sshCmd} ${args.join(' ')}`);
    
    const proc = spawn(sshCmd, cmdArgs, { shell: false });
    let stdout = '', stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      if (code === 0) resolve({ success: true, stdout, stderr, code });
      else reject({ success: false, stdout, stderr, code });
    });
    
    proc.on('error', (err) => reject({ success: false, error: err.message }));
  });
}

function listHosts() {
  console.log('\n=== SSH Orchestrator - Configured Hosts ===\n');
  console.log(`Host: ${config.sshHost}`);
  console.log(`User: ${config.sshUser}`);
  console.log(`Port: ${config.sshPort}`);
  console.log(`Auth: ${config.sshKeyPath ? 'Key-based' : 'Password-based'}\n`);
}

async function testConnection(hostConfig = null) {
  console.log('\n=== Testing SSH Connection ===\n');
  try {
    const result = await sshExec('echo "Connection test: SUCCESS" && uname -a', hostConfig);
    console.log(result.stdout);
    console.log('\n✅ SSH Connection OK\n');
    return true;
  } catch (err) {
    console.error('\n❌ SSH Connection FAILED');
    console.error(err.stderr || err.error);
    return false;
  }
}

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log(`
SSH Orchestrator v1.0.0
Usage: node ssh-orchestrator.js <command>

Commands:
  exec <cmd>  Execute command on remote host
  list        List configured hosts
  test        Test SSH connectivity
`);
  process.exit(0);
}

switch (command) {
  case 'exec':
    const execCmd = args.slice(1).join(' ');
    if (!execCmd) { console.error('Error: Provide command'); process.exit(1); }
    sshExec(execCmd).then(r => { console.log(r.stdout); process.exit(0); })
      .catch(e => { console.error(e.stderr || e.error); process.exit(1); });
    break;
  case 'list': listHosts(); break;
  case 'test': testConnection().then(ok => process.exit(ok ? 0 : 1)); break;
  default: console.error(`Unknown: ${command}`); process.exit(1);
}
