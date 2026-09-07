export interface FilePayload {
  name: string;
  size: number;
  type: string;
  content: string; // content (text or base64)
  isText: boolean;
  savedToWorkspace: boolean;
}

export interface ToolLog {
  toolName: string;
  args: any;
  result: any;
}

export interface ParallelAnswer {
  id: string;      // 'mistral' | 'gptoss'
  label: string;
  text: string;
  ok?: boolean;
}

export interface Message {
  id: string;
  role: "user" | "model";
  text?: string;
  file?: FilePayload;
  isTyping?: boolean;
  statusMessage?: string;
  logs?: ToolLog[];
  parallel?: ParallelAnswer[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

export interface FileMeta {
  name: string;
  path: string;
  size: number;
  updatedAt: string;
  isText: boolean;
}

export interface AppSyncInfo {
  id: string;
  name: string;
  status: 'unsynced' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: string;
  url: string;
  componentsCount: number;
  filesCount: number;
  apiEndpointsCount: number;
  description: string;
  syncLogs: string[];
}

export type AgentRole =
  | 'scout' | 'builder' | 'breaker' | 'closer'
  | 'architect' | 'developer' | 'pentester' | 'qa';

export type AgentMultiPipelineId =
  | 'fast' | 'engineering'
  | 'fast-building' | 'self-development' | 'self-fixed' | 'self-restored';

export interface AgentStepMeta {
  securityScore?: string;
  qaCoverage?: string;
  releaseTag?: string;
}

export interface AgentStep {
  id: string;
  agentRole: AgentRole;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'idle';
  timestamp: string;
  thoughts?: string;
  actualModel?: string;
  meta?: AgentStepMeta;
}

/** One SSE event received from POST /api/agents/orchestra/stream. */
export interface AgentMultiEvent {
  type:
    | 'run_start'
    | 'step_start'
    | 'step_chunk'
    | 'step_tool_start'
    | 'step_tool_result'
    | 'step_done'
    | 'step_failed'
    | 'run_done'
    | 'done'
    | 'error';
  data: any;
}
