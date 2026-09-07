import { SSHOrchestrator, DeviceConfig } from './ssh-orchestrator';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE = path.join(__dirname, 'devices.json');

// Load or create config
function loadConfig(): DeviceConfig[] {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
  return [];
}

function saveConfig(devices: DeviceConfig[]): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(devices, null, 2));
}

// Main orchestrator instance
const orchestrator = new SSHOrchestrator();

// Load saved devices
const savedDevices = loadConfig();
savedDevices.forEach(device => orchestrator.addDevice(device));

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'add':
      if (args.length < 5) {
        console.log('Usage: add <name> <host> <port> <username> [password]');
        process.exit(1);
      }
      const newDevice: DeviceConfig = {
        name: args[1],
        host: args[2],
        port: parseInt(args[3]),
        username: args[4],
        password: args[5] || undefined
      };
      orchestrator.addDevice(newDevice);
      saveConfig([...loadConfig(), newDevice]);
      break;

    case 'remove':
      orchestrator.removeDevice(args[1]);
      saveConfig(loadConfig().filter(d => d.name !== args[1]));
      break;

    case 'connect':
      await orchestrator.connect(args[1]);
      break;

    case 'connect-all':
      await orchestrator.connectAll();
      break;

    case 'exec':
      const result = await orchestrator.exec(args[1], args.slice(2).join(' '));
      console.log(result.stdout || result.stderr || result.error);
      process.exit(result.success ? 0 : 1);
      break;

    case 'exec-all':
      const results = await orchestrator.execAll(args.slice(1).join(' '));
      results.forEach(r => {
        console.log(`\n=== ${r.device} ===`);
        console.log(r.stdout || r.stderr || r.error);
      });
      break;

    case 'list':
      orchestrator.listDevices();
      break;

    case 'disconnect':
      orchestrator.disconnect(args[1]);
      break;

    case 'disconnect-all':
      orchestrator.disconnectAll();
      break;

    default:
      console.log(`
🔧 SSH Orchestrator Commands:

  add <name> <host> <port> <username> [password]
    - Add a new device

  remove <name>
    - Remove a device

  connect <name>
    - Connect to a specific device

  connect-all
    - Connect to all devices

  exec <name> <command>
    - Execute command on a device

  exec-all <command>
    - Execute command on all devices

  list
    - List all devices and their status

  disconnect <name>
    - Disconnect from a device

  disconnect-all
    - Disconnect from all devices
`);
  }
}

main().catch(console.error);

// Export for use as module
export { orchestrator, SSHOrchestrator, DeviceConfig };