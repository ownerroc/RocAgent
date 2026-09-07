import { Client } from 'ssh2';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import YAML from 'yaml';

/**
 * SSH Orchestrator - Multi-device SSH command execution
 * Usage: npx tsx index.ts <device-alias> <command>
 */

interface DeviceConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
}

interface DevicesConfig {
  devices: Record<string, DeviceConfig>;
}

const CONFIG_PATH = join(homedir(), '.agent', 'rocsystem', 'config', 'devices.yaml');

function loadConfig(): DevicesConfig {
  if (!existsSync(CONFIG_PATH)) {
    const defaultConfig: DevicesConfig = {
      devices: {
        'localhost': {
          host: '127.0.0.1',
          port: 8022,
          username: 'root',
        }
      }
    };
    return defaultConfig;
  }
  
  const content = readFileSync(CONFIG_PATH, 'utf-8');
  return YAML.parse(content);
}

function createClient(config: DeviceConfig): Promise<Client> {
  return new Promise((resolve, reject) => {
    const client = new Client();
    
    const connectionConfig: any = {
      host: config.host,
      port: config.port,
      username: config.username,
    };
    
    if (config.password) {
      connectionConfig.password = config.password;
    } else if (config.privateKeyPath) {
      connectionConfig.privateKey = readFileSync(config.privateKeyPath);
    }
    
    client.on('ready', () => {
      resolve(client);
    });
    
    client.on('error', (err) => {
      reject(err);
    });
    
    client.connect(connectionConfig);
  });
}

async function executeCommand(client: Client, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.exec(command, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      
      let stdout = '';
      let stderr = '';
      
      stream.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      
      stream.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      
      stream.on('close', (code: number) => {
        if (code !== 0 && stderr) {
          reject(new Error(stderr));
        } else {
          resolve(stdout);
        }
        client.end();
      });
    });
  });
}

function showHelp() {
  console.log(`
🖥️  SSH Orchestrator v1.0.0

Usage: 
  npx tsx index.ts <device-alias> <command>
  npx tsx index.ts list
  npx tsx index.ts add <alias> <host> <port> <username>
  npx tsx index.ts remove <alias>

Examples:
  npx tsx index.ts localhost "uname -a"
  npx tsx index.ts server1 "df -h"
  npx tsx index.ts list
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    process.exit(1);
  }
  
  const subcommand = args[0];
  
  // Handle list command
  if (subcommand === 'list' || subcommand === '--help' || subcommand === '-h') {
    const config = loadConfig();
    console.log('\n📋 Registered Devices:\n');
    for (const [alias, device] of Object.entries(config.devices)) {
      console.log(`  ${alias} → ${device.username}@${device.host}:${device.port}`);
    }
    console.log('');
    return;
  }
  
  // Handle add command
  if (subcommand === 'add') {
    const [alias, host, port, username] = args.slice(1);
    if (!alias || !host || !port || !username) {
      console.error('Usage: npx tsx index.ts add <alias> <host> <port> <username>');
      process.exit(1);
    }
    
    const config = loadConfig();
    config.devices[alias] = {
      host,
      port: parseInt(port),
      username
    };
    
    writeFileSync(CONFIG_PATH, YAML.stringify(config));
    console.log(`✅ Device '${alias}' added: ${username}@${host}:${port}`);
    return;
  }
  
  // Handle remove command
  if (subcommand === 'remove') {
    const alias = args[1];
    if (!alias) {
      console.error('Usage: npx tsx index.ts remove <alias>');
      process.exit(1);
    }
    
    const config = loadConfig();
    
    if (!config.devices[alias]) {
      console.error(`Device '${alias}' not found`);
      process.exit(1);
    }
    
    delete config.devices[alias];
    writeFileSync(CONFIG_PATH, YAML.stringify(config));
    console.log(`✅ Device '${alias}' removed`);
    return;
  }
  
  // Execute command on device (requires at least 2 args)
  if (args.length < 2) {
    showHelp();
    process.exit(1);
  }
  
  const alias = args[0];
  const command = args.slice(1).join(' ');
  
  console.log(`\n🔌 Connecting to ${alias}...`);
  console.log(`📤 Executing: ${command}\n`);
  
  try {
    const config = loadConfig();
    const device = config.devices[alias];
    
    if (!device) {
      console.error(`❌ Device '${alias}' not found. Run 'npx tsx index.ts list' to see available devices.`);
      process.exit(1);
    }
    
    const client = await createClient(device);
    const output = await executeCommand(client, command);
    
    console.log('📥 Output:');
    console.log(output);
    console.log('\n✅ Command executed successfully');
    
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);