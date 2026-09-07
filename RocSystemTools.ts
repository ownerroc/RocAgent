/**
 * RocSystem Tools - Type Definitions
 * Note: Tool implementations are registered in runtime DB via addTool.
 * This file provides TypeScript IntelliSense for VSCode.
 */

// Workspace & Navigation
export interface Systemnavigate {
  (id?: string, path?: string): any;
}
export interface SystemlistFile {
  (): any;
}
export interface SystemreadFile {
  (filename: string, startLine?: number, endLine?: number, lineNumbers?: boolean): any;
}
export interface SystemwriteFile {
  (filename: string, content: string): any;
}
export interface SystemdeleteFile {
  (filename: string): any;
}
export interface SystemeditFile {
  (filename: string, oldText: string, newText: string): any;
}
export interface Systemedit_project_file {
  (filename: string, oldText: string, newText: string): any;
}
export interface SystemsearchCode {
  (query: string): any;
}

// Tool Management
export interface SystemaddTool {
  (name: string, description: string, parameters: object): any;
}
export interface SystemselfDevelop {
  (action: 'register' | 'execute' | 'list', category?: string, codeSnippet?: string, name?: string, purpose?: string): any;
}

// Execution
export interface Systemterminal {
  (command: string, timeout?: number): any;
}
export interface Systemexec {
  (command: string): any;
}
export interface SystemsshRun {
  (command: string): any;
}

// Web & Network
export interface SystemwebSearch {
  (query: string, category?: 'tech' | 'general' | 'doc', depth?: 'quick' | 'deep'): any;
}
export interface SystemwebResearch {
  (query?: string, url?: string, maxLinks?: number): any;
}
export interface SystemhttpRequest {
  (url: string, method?: 'GET' | 'POST', body?: object, headers?: object): any;
}
export interface SystemroadfxHook {
  (url: string, secret: string, event?: string, ref?: string, commit?: string, repository?: string, head?: string, workflow?: string, auth?: string, data?: object, type?: 'json' | 'form-urlencoded' | 'json-extended', verifySsl?: boolean): any;
}

// Database
export interface SystemdbSync {
  (action?: 'check' | 'repair'): any;
}
export interface SystemquerySnowflake {
  (question: string, agent?: string, database?: string, schema?: string): any;
}
export interface SystemqueryNeon {
  (sql: string, confirm?: boolean): any;
}

// Storage & Security
export interface SystemstoreSecret {
  (key: string, value: string, passphrase: string, vaultFile: string): any;
}
export interface SystemdecryptFile {
  (filename: string, passphrase: string, format?: 'rocvault' | 'gpg' | 'openssl' | 'zip', outputFilename?: string, entryName?: string): any;
}

// Cloud & Containers
export interface SystemociVm {
  (action: 'list' | 'get' | 'launch' | 'power' | 'resize' | 'terminate', instanceId?: string, displayName?: string, shape?: string, ocpus?: number, memoryInGBs?: number, vmAction?: 'START' | 'STOP' | 'SOFTSTOP' | 'RESET' | 'SOFTRESET'): any;
}
export interface SystemrootFs {
  (subcommand: string, args?: string[], confirm?: boolean): any;
}
export interface SystemvmOci {
  (action: 'list' | 'read' | 'run', name?: string, args?: string[], confirm?: boolean): any;
}

// System Diagnostics
export interface Systemlsmod {
  (): any;
}
export interface SystemlsPosed {
  (action?: 'status' | 'modules'): any;
}
export interface SystemdevTool {
  (action: 'analyze' | 'fetch' | 'dom' | 'console' | 'network' | 'screenshot' | 'eval', file?: string, url?: string, js?: string, out?: string): any;
}

// AI & ML
export interface SystemaskModel {
  (provider: 'groq' | 'openai' | 'openrouter', prompt: string, model?: string): any;
}

// Version Control
export interface Systemgit {
  (action: 'status' | 'log' | 'diff' | 'pull' | 'sync', branch?: string, message?: string, confirm?: boolean): any;
}

// Memory
export interface Systemmemory {
  (action: 'store' | 'retrieve' | 'delete' | 'list', key?: string, value?: string, category?: string): any;
}

// ============== NEW FEATURES FOR ROCSYSTEM v2.1 ==============

// Multi-step workflow for complex tasks
export interface SystemplanExecute {
  (action: 'create' | 'execute' | 'status' | 'list' | 'cancel', plan?: string, steps?: Array<{ tool: string; args: any; continueOnError?: boolean }>, name?: string, planId?: string, maxParallel?: number): any;
}

// Evaluate and run code in a safe sandboxed environment
export interface SystemevaluateCode {
  (code: string, language?: 'javascript' | 'typescript', timeout?: number, context?: object): any;
}

// Analyze file structure and generate insights
export interface SystemcodeAnalyze {
  (action: 'structure' | 'dependencies' | 'security' | 'performance' | 'full', filename?: string, maxDepth?: number): any;
}

// Create and manage background tasks
export interface SystembackgroundTask {
  (action: 'start' | 'stop' | 'status' | 'list' | 'logs', taskId?: string, command?: string, name?: string, schedule?: string): any;
}

// Stream results from agent execution
export interface SystemagentStream {
  (prompt: string, options?: { model?: string; temperature?: number; maxTokens?: number; stream?: boolean }): any;
}

// Export all as namespace
export const RocSystem: {
  navigate: Systemnavigate;
  listFile: SystemlistFile;
  readFile: SystemreadFile;
  writeFile: SystemwriteFile;
  deleteFile: SystemdeleteFile;
  editFile: SystemeditFile;
  edit_project_file: Systemedit_project_file;
  searchCode: SystemsearchCode;
  addTool: SystemaddTool;
  selfDevelop: SystemselfDevelop;
  terminal: Systemterminal;
  exec: Systemexec;
  sshRun: SystemsshRun;
  webSearch: SystemwebSearch;
  webResearch: SystemwebResearch;
  httpRequest: SystemhttpRequest;
  roadfxHook: SystemroadfxHook;
  dbSync: SystemdbSync;
  querySnowflake: SystemquerySnowflake;
  queryNeon: SystemqueryNeon;
  storeSecret: SystemstoreSecret;
  decryptFile: SystemdecryptFile;
  ociVm: SystemociVm;
  rootFs: SystemrootFs;
  vmOci: SystemvmOci;
  lsmod: Systemlsmod;
  lsPosed: SystemlsPosed;
  devTool: SystemdevTool;
  askModel: SystemaskModel;
  git: Systemgit;
  memory: Systemmemory;
  planExecute: SystemplanExecute;
  evaluateCode: SystemevaluateCode;
  codeAnalyze: SystemcodeAnalyze;
  backgroundTask: SystembackgroundTask;
  agentStream: SystemagentStream;
};