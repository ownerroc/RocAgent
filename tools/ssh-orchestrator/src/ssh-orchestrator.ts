import { Client, ConnectConfig } from 'ssh2';
import ora from 'ora';
import chalk from 'chalk';

export interface DeviceConfig {
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export interface CommandResult {
  device: string;
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

export class SSHOrchestrator {
  private connections: Map<string, Client> = new Map();
  private devices: Map<string, DeviceConfig> = new Map();

  /**
   * Add a device to the orchestrator
   */
  addDevice(config: DeviceConfig): void {
    this.devices.set(config.name, config);
    console.log(chalk.green(`✓ Device '${config.name}' added (${config.host}:${config.port})`));
  }

  /**
   * Remove a device from the orchestrator
   */
  removeDevice(name: string): boolean {
    const removed = this.devices.delete(name);
    const conn = this.connections.get(name);
    if (conn) {
      conn.end();
      this.connections.delete(name);
    }
    return removed;
  }

  /**
   * Connect to a single device
   */
  async connect(name: string): Promise<boolean> {
    const config = this.devices.get(name);
    if (!config) {
      console.log(chalk.red(`✗ Device '${name}' not found`));
      return false;
    }

    const spinner = ora(`Connecting to ${name}...`).start();
    
    return new Promise((resolve) => {
      const client = new Client();
      
      const connectConfig: ConnectConfig = {
        host: config.host,
        port: config.port,
        username: config.username,
        readyTimeout: 10000,
      };

      if (config.password) {
        connectConfig.password = config.password;
      } else if (config.privateKey) {
        connectConfig.privateKey = config.privateKey;
      }

      client.on('ready', () => {
        spinner.succeed(`Connected to ${name}`);
        this.connections.set(name, client);
        resolve(true);
      });

      client.on('error', (err) => {
        spinner.fail(`Failed to connect to ${name}: ${err.message}`);
        resolve(false);
      });

      client.connect(connectConfig);
    });
  }

  /**
   * Connect to all registered devices
   */
  async connectAll(): Promise<void> {
    const promises = Array.from(this.devices.keys()).map(name => this.connect(name));
    await Promise.all(promises);
  }

  /**
   * Execute command on a single device
   */
  async exec(name: string, command: string): Promise<CommandResult> {
    const client = this.connections.get(name);
    
    if (!client) {
      return {
        device: name,
        success: false,
        stdout: '',
        stderr: '',
        error: `Not connected to ${name}. Call connect() first.`
      };
    }

    return new Promise((resolve) => {
      client.exec(command, (err, stream) => {
        if (err) {
          resolve({
            device: name,
            success: false,
            stdout: '',
            stderr: '',
            error: err.message
          });
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code: number) => {
          resolve({
            device: name,
            success: code === 0,
            stdout,
            stderr,
          });
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      });
    });
  }

  /**
   * Execute command on all connected devices
   */
  async execAll(command: string): Promise<CommandResult[]> {
    const promises = Array.from(this.connections.keys()).map(name => this.exec(name, command));
    return Promise.all(promises);
  }

  /**
   * Disconnect from a device
   */
  disconnect(name: string): void {
    const client = this.connections.get(name);
    if (client) {
      client.end();
      this.connections.delete(name);
      console.log(chalk.yellow(`Disconnected from ${name}`));
    }
  }

  /**
   * Disconnect from all devices
   */
  disconnectAll(): void {
    this.connections.forEach((client, name) => {
      client.end();
      console.log(chalk.yellow(`Disconnected from ${name}`));
    });
    this.connections.clear();
  }

  /**
   * List all registered devices and their status
   */
  listDevices(): void {
    console.log(chalk.bold('\n📋 Registered Devices:\n'));
    this.devices.forEach((config, name) => {
      const connected = this.connections.has(name);
      const status = connected ? chalk.green('● Connected') : chalk.red('○ Disconnected');
      console.log(`  ${chalk.cyan(name)} - ${config.host}:${config.port} [${config.username}] ${status}`);
    });
    console.log('');
  }

  /**
   * Get connection status
   */
  isConnected(name: string): boolean {
    return this.connections.has(name);
  }

  /**
   * Get all device names
   */
  getDeviceNames(): string[] {
    return Array.from(this.devices.keys());
  }
}

export default SSHOrchestrator;