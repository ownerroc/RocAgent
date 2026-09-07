#!/usr/bin/env node

/**
 * RocSystem CI/CD Pipeline
 * Automated deployment, health check, and rollback
 * 
 * Usage:
 *   node cicd-pipeline.js deploy <target> [--tag=<version>]
 *   node cicd-pipeline.js health <target>
 *   node cicd-pipeline.js rollback <target>
 *   node cicd-pipeline.js status <target>
 *   node cicd-pipeline.js list
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

// Config
const CONFIG_FILE = path.join(__dirname, 'config.json');
const DEPLOY_HISTORY_FILE = path.join(__dirname, 'deploy-history.json');

// Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig = {
      targets: {
        local: {
          type: 'ssh',
          host: process.env.SSH_HOST || 'localhost',
          user: process.env.SSH_USER || 'u0_a236',
          port: process.env.SSH_PORT || '8022',
          password: process.env.SSH_PASSWORD || '',
          deployPath: '/data/data/com.termux/files/home/.agent/rocsystem'
        }
      },
      healthCheck: {
        port: 3001,
        endpoint: '/health',
        timeout: 30000,
        retries: 3
      }
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function loadHistory() {
  if (!fs.existsSync(DEPLOY_HISTORY_FILE)) {
    return { deployments: [] };
  }
  return JSON.parse(fs.readFileSync(DEPLOY_HISTORY_FILE, 'utf8'));
}

function saveHistory(history) {
  fs.writeFileSync(DEPLOY_HISTORY_FILE, JSON.stringify(history, null, 2));
}

function sshExec(target, command) {
  const config = loadConfig();
  const t = config.targets[target];
  
  if (!t) {
    throw new Error(`Target '${target}' not found`);
  }

  const sshCmd = `sshpass -e ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p ${t.port} ${t.user}@${t.host} "${command.replace(/"/g, '\\"')}"`;
  
  try {
    process.env.SSH_PASSWORD = t.password;
    const result = execSync(sshCmd, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output: result };
  } catch (err) {
    return { success: false, output: err.message };
  }
}

async function healthCheck(target) {
  const config = loadConfig();
  const hc = config.healthCheck;
  
  log(`\n=== Health Check: ${target} ===`, BLUE);
  
  const result = sshExec(target, `curl -sf http://127.0.0.1:${hc.port}${hc.endpoint} || echo "FAILED"`);
  
  if (result.success && result.output.includes('FAILED')) {
    log(`❌ Health check failed: Service not responding`, RED);
    return false;
  }
  
  if (result.success) {
    log(`✅ Health check passed`, GREEN);
    return true;
  }
  
  const portCheck = sshExec(target, `netstat -tln 2>/dev/null | grep :${hc.port} || ss -tln | grep :${hc.port}`);
  if (portCheck.success && portCheck.output.includes(`${hc.port}`)) {
    log(`✅ Port ${hc.port} is listening`, GREEN);
    return true;
  }
  
  log(`❌ Health check failed`, RED);
  return false;
}

async function deploy(target, tag = 'latest') {
  const config = loadConfig();
  const t = config.targets[target];
  
  log(`\n=== Deploying to ${target} (tag: ${tag}) ===`, BLUE);
  
  log(`Creating backup...`, YELLOW);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup-${timestamp}`;
  
  const backupResult = sshExec(target, `cd ${t.deployPath} && mkdir -p backups && tar -czf backups/${backupName}.tar.gz . --exclude=node_modules --exclude=.git 2>/dev/null || echo "Backup skipped"`);
  
  log(`Pulling latest code...`, YELLOW);
  const gitResult = sshExec(target, `cd ${t.deployPath} && git pull origin main 2>&1 || echo "Git pull skipped"`);
  
  log(`Installing dependencies...`, YELLOW);
  const installResult = sshExec(target, `cd ${t.deployPath} && npm install 2>&1`);
  
  log(`Restarting service...`, YELLOW);
  const restartResult = sshExec(target, `pkill -f "node.*server" 2>/dev/null; sleep 2; cd ${t.deployPath} && node server.js > /dev/null 2>&1 &`);
  
  log(`Waiting for service to start...`, YELLOW);
  await new Promise(r => setTimeout(r, 5000));
  
  const healthy = await healthCheck(target);
  
  const history = loadHistory();
  history.deployments.push({
    target,
    tag,
    timestamp: new Date().toISOString(),
    success: healthy,
    backup: backupName
  });
  saveHistory(history);
  
  if (healthy) {
    log(`\n✅ Deployment successful!`, GREEN);
    return true;
  } else {
    log(`\n❌ Deployment failed!`, RED);
    return false;
  }
}

async function rollback(target) {
  const history = loadHistory();
  const deployments = history.deployments.filter(d => d.target === target && d.success);
  
  if (deployments.length === 0) {
    log(`❌ No successful deployments found`, RED);
    return false;
  }
  
  const lastDeploy = deployments[deployments.length - 1];
  const config = loadConfig();
  const t = config.targets[target];
  
  log(`\n=== Rolling back ${target} ===`, YELLOW);
  log(`Restoring from: ${lastDeploy.backup}`, YELLOW);
  
  const restoreResult = sshExec(target, `cd ${t.deployPath} && tar -xzf backups/${lastDeploy.backup}.tar.gz 2>&1`);
  
  if (restoreResult.success) {
    log(`✅ Rollback successful`, GREEN);
    return true;
  } else {
    log(`❌ Rollback failed: ${restoreResult.output}`, RED);
    return false;
  }
}

function status(target) {
  const config = loadConfig();
  
  log(`\n=== Status: ${target} ===`, BLUE);
  
  const procResult = sshExec(target, `ps aux | grep -v grep | grep "node.*server" || echo "NOT_RUNNING"`);
  
  if (procResult.output.includes('NOT_RUNNING')) {
    log(`Service: ❌ Not running`, RED);
  } else {
    log(`Service: ✅ Running`, GREEN);
  }
  
  const portResult = sshExec(target, `netstat -tln 2>/dev/null | grep :${config.healthCheck.port} || ss -tln | grep :${config.healthCheck.port} || echo "PORT_NOT_OPEN"`);
  
  if (portResult.output.includes('PORT_NOT_OPEN')) {
    log(`Port ${config.healthCheck.port}: ❌ Not listening`, RED);
  } else {
    log(`Port ${config.healthCheck.port}: ✅ Listening`, GREEN);
  }
  
  const history = loadHistory();
  const recent = history.deployments.filter(d => d.target === target).slice(-3);
  
  log(`\nRecent deployments:`, YELLOW);
  recent.forEach(d => {
    const status = d.success ? '✅' : '❌';
    log(`  ${status} ${d.timestamp} (${d.tag})`, RESET);
  });
}

function list() {
  const config = loadConfig();
  
  log(`\n=== Available Targets ===`, BLUE);
  Object.keys(config.targets).forEach(key => {
    const t = config.targets[key];
    log(`  • ${key}: ${t.user}@${t.host}:${t.port}`, RESET);
  });
  
  log(`\n=== Commands ===`, BLUE);
  log(`  node cicd-pipeline.js deploy <target> [--tag=<version>]`, RESET);
  log(`  node cicd-pipeline.js health <target>`, RESET);
  log(`  node cicd-pipeline.js rollback <target>`, RESET);
  log(`  node cicd-pipeline.js status <target>`, RESET);
  log(`  node cicd-pipeline.js list`, RESET);
}

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  list();
  process.exit(0);
}

const target = args[1];
const options = args.slice(2).reduce((acc, opt) => {
  if (opt.startsWith('--')) {
    const [key, val] = opt.slice(2).split('=');
    acc[key] = val;
  }
  return acc;
}, {});

(async () => {
  try {
    switch (command) {
      case 'deploy':
        if (!target) { log('Usage: node cicd-pipeline.js deploy <target> [--tag=<version>]', RED); process.exit(1); }
        await deploy(target, options.tag || 'latest');
        break;
      case 'health':
        if (!target) { log('Usage: node cicd-pipeline.js health <target>', RED); process.exit(1); }
        await healthCheck(target);
        break;
      case 'rollback':
        if (!target) { log('Usage: node cicd-pipeline.js rollback <target>', RED); process.exit(1); }
        await rollback(target);
        break;
      case 'status':
        if (!target) { log('Usage: node cicd-pipeline.js status <target>', RED); process.exit(1); }
        status(target);
        break;
      case 'list':
        list();
        break;
      default:
        log(`Unknown command: ${command}`, RED);
        list();
        process.exit(1);
    }
  } catch (err) {
    log(`Error: ${err.message}`, RED);
    process.exit(1);
  }
})();