import { Tool } from '../types';

export const appManagerTool: Tool = {
  name: 'appManager',
  description: 'Kelola aplikasi Android (list, install, uninstall, start, stop). Pakai pm command Android.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'install', 'uninstall', 'start', 'stop', 'info', 'permissions'],
        description: 'Aksi yang mau dilakukan'
      },
      packageName: {
        type: 'string',
        description: 'Nama package aplikasi (contoh: com.spotify.music)'
      },
      apkPath: {
        type: 'string',
        description: 'Path ke file APK untuk install'
      }
    },
    required: ['action']
  }
};

// Handler execution
export async function handleAppManager(args: any): Promise<any> {
  const { action, packageName, apkPath } = args;
  
  let cmd = '';
  
  switch (action) {
    case 'list':
      // List semua third-party apps
      cmd = 'pm list packages -3 | sort';
      break;
    case 'install':
      if (!apkPath) return { error: 'apkPath wajib untuk action install' };
      cmd = `pm install -r "${apkPath}"`;
      break;
    case 'uninstall':
      if (!packageName) return { error: 'packageName wajib untuk action uninstall' };
      cmd = `pm uninstall ${packageName}`;
      break;
    case 'start':
      if (!packageName) return { error: 'packageName wajib untuk action start' };
      cmd = `monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`;
      break;
    case 'stop':
      if (!packageName) return { error: 'packageName wajib untuk action stop' };
      cmd = `am force-stop ${packageName}`;
      break;
    case 'info':
      if (!packageName) return { error: 'packageName wajib untuk action info' };
      cmd = `dumpsys package ${packageName}`;
      break;
    case 'permissions':
      if (!packageName) return { error: 'packageName wajib untuk action permissions' };
      cmd = `dumpsys package ${packageName} | grep -A 50 "granted=true"`;
      break;
    default:
      return { error: `Action tidak dikenal: ${action}` };
  }
  
  // Execute via SSH ke device
  const { execSync } = await import('child_process');
  try {
    const output = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    return { success: true, action, output: output.substring(0, 8000) };
  } catch (err: any) {
    return { success: false, action, error: err.message };
  }
}